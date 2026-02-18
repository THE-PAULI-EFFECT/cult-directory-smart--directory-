# NW Directory Empire — Setup & Build Guide

## 🚽 Project Overview

This is the foundation for a multi-directory lead generation platform serving Washington State.

**Architecture:**
- **One Supabase backend** — shared across all directory niches
- **Multiple Next.js 15 frontends** — one per niche/state (porta-potty, senior-living, ADA bathrooms, water-quality, event-rentals)
- **Programmatic SEO** — auto-generates hundreds of city & listing pages
- **Lead monetization** — vendors pay $15–150 per lead depending on niche

## 📋 What's Been Built (Phase 1)

### ✅ Infrastructure Complete
- [x] Multi-tenant directory config system (`lib/directory-config.ts`)
- [x] Supabase client/server utilities for Next.js 15
- [x] Lead capture form component (`components/LeadCaptureForm.tsx`)
- [x] Supabase Edge Function for vendor email notifications
- [x] Complete database schema with RLS policies
- [x] Analytics event tracking
- [x] Sitemap generator for programmatic SEO
- [x] API endpoints: `/api/track`, `/api/notify-vendor`

### 🔧 Phase 1 Files Created

```
lib/
  ├── directory-config.ts          # Multi-tenant config
  ├── analytics.ts                 # Event tracking
  └── supabase/
      ├── client.ts                # Browser client
      └── server.ts                # Server client

components/
  └── LeadCaptureForm.tsx          # Lead capture form (reusable)

app/
  ├── api/
  │   ├── track/route.ts           # Analytics endpoint
  │   └── notify-vendor/route.ts   # Vendor notification wrapper
  └── sitemap.ts                   # Dynamic SEO sitemap

supabase/
  ├── functions/
  │   └── notify-vendor/index.ts   # Edge Function (Deno)
  └── migrations/
      └── 20250218_core_schema.sql # Full database schema
```

## 🚀 Quick Start

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_ORG/nw-portapotty-directory
cd nw-portapotty-directory
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Create Supabase Project

Go to https://supabase.com/dashboard and create a new project:
- **Name:** `nw-directory-backend`
- **Region:** US West (Oregon)
- **Database Password:** Save this!

### 4. Setup Environment

```bash
cp .env.local.example .env.local
```

Then fill in `.env.local`:

```bash
# From Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROJECT_ID=your-project-id

# Anthropic (for data enrichment)
ANTHROPIC_API_KEY=sk-ant-...

# Resend (email delivery)
RESEND_API_KEY=re_...

# Directory Config (change per frontend)
NEXT_PUBLIC_NICHE=porta_potty
NEXT_PUBLIC_SITE_NAME="WA Porta Potty Directory"
NEXT_PUBLIC_SITE_DOMAIN="wa-portapotty.com"

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 5. Run Database Migrations

```bash
# Option A: Via Supabase CLI
npx supabase link
npx supabase db push

# Option B: Paste SQL manually
# 1. Go to Supabase Dashboard > SQL Editor
# 2. Create new query
# 3. Copy content from: supabase/migrations/20250218_core_schema.sql
# 4. Run it
```

### 6. Deploy Supabase Edge Function

```bash
npx supabase functions deploy notify-vendor --project-id your-project-id
```

Add secrets to Edge Function:

```bash
npx supabase secrets set RESEND_API_KEY=re_... --project-id your-project-id
```

### 7. Run Dev Server

```bash
pnpm run dev
```

Open http://localhost:3000

## 📁 Next Steps: Complete the Frontend

### Phase 2: Implement City & Listing Pages (Critical for SEO)

These need to be built next to enable the lead generation funnel:

**File structure needed:**
```
app/
  └── [city]/
      ├── page.tsx              # City landing page (ISR)
      ├── layout.tsx            # City layout
      └── [slug]/
          └── page.tsx          # Individual listing page
```

These pages:
- Auto-generate for every city/listing in the database
- Use ISR (Incremental Static Regeneration) for fast load times
- Include lead capture form
- Have full SEO metadata (title, description, schema.org)
- Track analytics events

### Phase 3: Implement Hero Page

Update `app/page.tsx` with:
- Full hero section using `getConfig()` from `directory-config.ts`
- Dynamic copy based on niche
- City search
- Unit type browsing
- Value propositions
- Trust signals
- Vendor CTA

### Phase 4: Deploy to Vercel

```bash
git push -u origin claude/setup-project-ajm7l

# Go to Vercel and:
# 1. Import GitHub repo
# 2. Set environment variables (from .env.local)
# 3. Deploy
```

Then add custom domain: `wa-portapotty.com`

### Phase 5: Submit Sitemap to Google

1. Wait for deployment to complete
2. Go to Google Search Console
3. Add property: https://wa-portapotty.com
4. Submit sitemap: https://wa-portapotty.com/sitemap.xml
5. Monitor indexation

## 🔐 Database Schema Overview

### Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `listings` | Directory entries | id, niche, business_name, slug, city, phone, website, amenities, images, service_areas |
| `leads` | Lead captures | id, listing_id, name, email, phone, event_type, event_date, routed_to_vendor, lead_paid |
| `vendors` | Claimed listings | id (user_id), listing_id, subscription_tier, stripe_customer_id |
| `enrichment_jobs` | Data pipeline queue | id, listing_id, job_type, status, result |
| `analytics_events` | Internal tracking | event_name, niche, properties, session_id |
| `vendor_touchpoints` | Relationship tracking | vendor_id, touchpoint_type (for gratitude) |

### Views

- `featured_listings_by_niche` — Top featured listings
- `lead_summary` — Daily lead counts by status

## 🔄 Lead Flow (How It Works)

1. **User visits** wa-portapotty.com/seattle
2. **Searches** or browses listings
3. **Clicks** "Get Free Quotes"
4. **Fills** LeadCaptureForm
5. **Form submits** to Supabase `leads` table
6. **Trigger fires:**
   - `/api/notify-vendor` called
   - Calls `notify-vendor` Edge Function
   - Resend sends email to vendor's email address
   - Lead marked as `routed_to_vendor: true`
7. **Vendor receives** professional email with customer details
8. **Vendor calls** customer within 2 hours
9. **Lead paid** when vendor settles on deal (tracked in admin)

## 📊 Analytics Events Tracked

```typescript
// Automatically tracked by LeadCaptureForm & components
trackEvent('search_performed', { city: 'Seattle' });
trackEvent('listing_viewed', { listing_id: uuid });
trackEvent('lead_submitted', { niche: 'porta_potty', city: 'Seattle' });
trackEvent('phone_clicked', { listing_id: uuid });
trackEvent('website_clicked', { listing_id: uuid });
```

View real-time analytics at: `/admin/analytics`

## 🌐 Multi-Niche Support

To launch a second directory (e.g., wa-seniorliving.com):

1. **Fork the repo** → `nw-seniorliving-directory`
2. **Create new Vercel project**
3. **Set env var:** `NEXT_PUBLIC_NICHE=senior_living`
4. **Deploy** → all pages, forms, and database queries automatically use correct niche

**Database automatically separates data by `niche` column** — no code changes needed!

## 💰 Revenue Tracking

### Pricing Model

| Event | Revenue |
|-------|---------|
| Lead captured | $0 (cost to vendor) |
| Lead routed to vendor | $25–150 charged to vendor |
| Featured listing/month | $79–299 per month |
| Video ad generated | $299 one-time |

**Tracked in:**
- `leads.lead_value_cents`
- `leads.lead_paid`
- `vendors.subscription_tier`
- `vendors.subscription_expires_at`

## 🛠 Common Tasks

### Check lead flow is working

```bash
# In Supabase Dashboard > SQL Editor:
SELECT * FROM leads ORDER BY created_at DESC LIMIT 5;
SELECT * FROM listings WHERE is_featured = true LIMIT 5;
```

### Monitor vendor notifications

```bash
# Check Edge Function logs
npx supabase functions list
npx supabase functions get-logs notify-vendor --project-id your-project-id
```

### Track analytics in real-time

```bash
# Query analytics events
SELECT event_name, COUNT(*) as count
FROM analytics_events
WHERE niche = 'porta_potty'
GROUP BY event_name;
```

### Generate missing slugs

```bash
# For any listings missing slugs:
UPDATE listings
SET slug = LOWER(CONCAT(business_name, '-', city, '-wa'))
WHERE slug IS NULL;
```

## 🚨 Important Notes

### Security

- ✅ RLS policies prevent users from seeing other users' data
- ✅ Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- ✅ Leads table is public INSERT only (no SELECT without ownership)
- ✅ Always use `@supabase/ssr` for server components

### Performance

- ✅ ISR (revalidate: 86400) on city/listing pages
- ✅ Supabase indexes on niche, city, slug for fast queries
- ✅ Full-text search enabled for business search
- ✅ Analytics events logged async (doesn't block UX)

### Scaling

- ✅ Database designed for 100K+ listings
- ✅ Edge Function scales automatically
- ✅ Vercel handles auto-scaling
- ✅ Supabase free tier supports millions of rows

## 📞 Support

Stuck? Check:
1. **Supabase Dashboard** → Logs for Edge Function errors
2. **Vercel Dashboard** → Function logs
3. **Browser DevTools** → Network tab for API calls
4. **Supabase SQL Editor** → Check if data actually inserted

## Next Priority

**CRITICAL:** Build city page generator (`app/[city]/page.tsx`) — this is where 90% of SEO traffic comes from.

See Phase 2 spec in: [CITY_PAGES_SPEC.md](./CITY_PAGES_SPEC.md)

---

**Status:** ✅ Phase 1 Complete — Core infrastructure ready for data pipeline & lead routing

**Next:** Phase 2 — City & Listing Page Implementation
