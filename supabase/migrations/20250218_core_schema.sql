-- NW Directory Empire — Core Database Schema
-- Runs on Supabase for all directory niches
-- One backend supports: porta-potty, senior-living, ADA bathrooms, water-quality, event-rentals

-- ============================================================================
-- LISTINGS TABLE (Core directory data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche TEXT NOT NULL, -- 'porta_potty', 'senior_living', 'ada_bathroom', 'water_quality', 'event_rentals'
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- SEO-friendly: "abc-portapotty-seattle-wa"

  -- Contact & Location
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'Washington',
  zip TEXT,
  county TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  phone TEXT,
  website TEXT,
  email TEXT,

  -- Google Review Aggregation
  google_rating DECIMAL(3,2),
  google_review_count INT DEFAULT 0,

  -- Enrichment Fields (from 7-step pipeline)
  unit_types JSONB DEFAULT '[]', -- [{"type":"2-stall","capacity":50,"features":[...]},...]
  amenities TEXT[] DEFAULT '{}', -- ['running_water','ac','ada_compliant',...]
  service_areas TEXT[] DEFAULT '{}', -- ['Seattle','Bellevue','...]
  service_radius_miles INT,
  images JSONB DEFAULT '[]', -- [{url, alt, primary, verified_by_claude_vision},...]
  description TEXT,

  -- Business Metadata
  year_established INT,
  is_verified BOOLEAN DEFAULT false, -- Crawl4AI verified
  is_featured BOOLEAN DEFAULT false, -- Paid feature
  is_luxury BOOLEAN DEFAULT false, -- Has luxury units
  listing_tier TEXT DEFAULT 'free', -- 'free', 'basic', 'featured', 'premium'

  -- Pricing (if scraped)
  price_per_day_min INT, -- in cents
  price_per_day_max INT,
  price_transparency_score INT DEFAULT 0, -- 0-100

  -- Status & Lifecycle
  status TEXT DEFAULT 'active', -- 'active', 'pending', 'inactive', 'claimed'
  claimed_by UUID REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enriched_at TIMESTAMPTZ,

  -- Data Source
  scrape_source TEXT -- 'outscraper', 'manual', 'crawl4ai', 'user_submitted'
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_listings_niche_status ON listings(niche, status);
CREATE INDEX IF NOT EXISTS idx_listings_niche_city ON listings(niche, city);
CREATE INDEX IF NOT EXISTS idx_listings_niche_county ON listings(niche, county);
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);
CREATE INDEX IF NOT EXISTS idx_listings_is_featured ON listings(is_featured);
CREATE INDEX IF NOT EXISTS idx_listings_is_luxury ON listings(is_luxury);
CREATE INDEX IF NOT EXISTS idx_listings_claimed_by ON listings(claimed_by);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_listings_fts ON listings
  USING gin(to_tsvector('english', coalesce(business_name,'') || ' ' || coalesce(description,'')));

-- ============================================================================
-- LEADS TABLE (Lead capture & routing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  niche TEXT NOT NULL, -- Track which directory this lead came from

  -- Contact Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Request Details
  event_type TEXT, -- 'wedding', 'construction', 'film', 'festival', 'corporate', etc.
  event_date DATE,
  event_location TEXT,
  unit_quantity INT DEFAULT 1,
  unit_type TEXT, -- '2-stall', 'standard', 'luxury', 'ada', etc.
  duration_days INT DEFAULT 1,
  message TEXT,

  -- Routing & Status
  routed_to_vendor BOOLEAN DEFAULT false,
  routed_at TIMESTAMPTZ,
  vendor_response TEXT,

  -- Monetization
  lead_value_cents INT, -- How much vendor pays per lead
  lead_paid BOOLEAN DEFAULT false,

  -- Metadata
  source_url TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For follow-up
  follow_up_email_sent_at TIMESTAMPTZ,
  follow_up_sms_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_niche ON leads(niche);
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_routed ON leads(routed_to_vendor);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- ============================================================================
-- VENDORS TABLE (Claimed listings & subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,

  -- Subscription
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'featured', 'premium'
  subscription_expires_at TIMESTAMPTZ,

  -- Stripe Integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Lead Balance (prepaid leads)
  lead_balance INT DEFAULT 0,

  -- Status
  verified BOOLEAN DEFAULT false,
  verification_code TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_listing_id ON vendors(listing_id);
CREATE INDEX IF NOT EXISTS idx_vendors_subscription_tier ON vendors(subscription_tier);

-- ============================================================================
-- ENRICHMENT JOBS TABLE (Track data pipeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,

  -- Job Type
  job_type TEXT NOT NULL, -- 'inventory', 'images', 'amenities', 'service_areas'

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'complete', 'failed'
  result JSONB,
  error TEXT,

  -- Retry Logic
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_listing_id ON enrichment_jobs(listing_id);

-- ============================================================================
-- ANALYTICS TABLE (Internal tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL, -- 'search_performed', 'listing_viewed', 'lead_submitted', etc.
  niche TEXT,
  properties JSONB,

  -- User tracking
  session_id TEXT,
  user_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_niche ON analytics_events(niche);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);

-- ============================================================================
-- VENDOR TOUCHPOINTS TABLE (For gratitude + relationship tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,

  -- Type
  touchpoint_type TEXT NOT NULL, -- 'claimed_listing', 'featured_upgrade', 'lead_received', 'manual_outreach', 'anniversary'
  message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_touchpoints_vendor_id ON vendor_touchpoints(vendor_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_touchpoints ENABLE ROW LEVEL SECURITY;

-- LISTINGS: Public can read active listings
CREATE POLICY "Public can read active listings"
  ON listings FOR SELECT
  USING (status = 'active');

-- LISTINGS: Vendors can read their own listing
CREATE POLICY "Vendors can read their own listing"
  ON listings FOR SELECT
  USING (claimed_by = auth.uid() OR status = 'active');

-- LISTINGS: Service role can do everything (for enrichment pipeline)
CREATE POLICY "Service role full access to listings"
  ON listings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- LEADS: Only service role and vendor can read their leads
CREATE POLICY "Vendors can read their leads"
  ON leads FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE claimed_by = auth.uid()
    )
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- LEADS: Anyone can insert (submit form)
CREATE POLICY "Anyone can submit leads"
  ON leads FOR INSERT
  WITH CHECK (true);

-- VENDORS: Users can read/update their own vendor profile
CREATE POLICY "Vendors can read their own profile"
  ON vendors FOR SELECT
  USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Vendors can update their own profile"
  ON vendors FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on listings
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at_trigger
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_listings_updated_at();

-- Update updated_at timestamp on vendors
CREATE OR REPLACE FUNCTION update_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_updated_at_trigger
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_vendors_updated_at();

-- ============================================================================
-- VIEWS (Convenience queries)
-- ============================================================================

-- Featured listings by niche
CREATE OR REPLACE VIEW featured_listings_by_niche AS
SELECT niche, city, business_name, google_rating, google_review_count, is_luxury
FROM listings
WHERE status = 'active' AND is_featured = true
ORDER BY niche, google_rating DESC;

-- Lead routing summary
CREATE OR REPLACE VIEW lead_summary AS
SELECT
  niche,
  DATE(created_at) as date,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN routed_to_vendor THEN 1 END) as routed_leads,
  COUNT(CASE WHEN lead_paid THEN 1 END) as paid_leads
FROM leads
GROUP BY niche, DATE(created_at)
ORDER BY date DESC;
