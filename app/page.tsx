import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getConfig } from '@/lib/directory-config';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';

// Washington State cities for quick browse (fallback if DB empty)
const WA_CITIES_FALLBACK = [
  'Seattle', 'Tacoma', 'Spokane', 'Vancouver', 'Bellevue',
  'Olympia', 'Everett', 'Kirkland', 'Redmond', 'Renton',
  'Bellingham', 'Yakima',
];

export default async function HomePage() {
  const config = getConfig();
  const supabase = createClient();

  // Featured listings
  const { data: featured } = await supabase
    .from('listings')
    .select('id, business_name, slug, city, google_rating, google_review_count, is_luxury, amenities')
    .eq('niche', config.niche)
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('google_rating', { ascending: false })
    .limit(6);

  // Total count for trust signal
  const { count: totalListings } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('niche', config.niche)
    .eq('status', 'active');

  // Cities ranked by listing count
  const { data: cityData } = await supabase
    .from('listings')
    .select('city')
    .eq('niche', config.niche)
    .eq('status', 'active');

  const cityCounts = (cityData ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.city] = (acc[l.city] ?? 0) + 1;
    return acc;
  }, {});

  const topCities = Object.entries(cityCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([city, count]) => ({ city, count }));

  const displayCities =
    topCities.length > 0
      ? topCities
      : WA_CITIES_FALLBACK.map((c) => ({ city: c, count: 0 }));

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`,
        }}
        className="text-white"
      >
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {(totalListings ?? 0) > 0
                  ? `${totalListings?.toLocaleString()}+ verified Washington vendors`
                  : 'Verified Washington vendors'}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
                {config.heroHeadline}
              </h1>

              <p className="text-xl opacity-90 mb-8 max-w-xl leading-relaxed">
                {config.heroSubheadline}
              </p>

              {/* Quick city links */}
              <div className="flex flex-wrap gap-2 mb-8">
                {WA_CITIES_FALLBACK.slice(0, 6).map((city) => (
                  <Link
                    key={city}
                    href={`/${city.toLowerCase().replace(/\s+/g, '-')}`}
                    className="bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    {city}
                  </Link>
                ))}
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-6 text-sm opacity-80">
                <span className="flex items-center gap-2">✅ Free quotes</span>
                <span className="flex items-center gap-2">⚡ 2-hour response</span>
                <span className="flex items-center gap-2">⭐ Verified reviews</span>
                <span className="flex items-center gap-2">🔒 No spam</span>
              </div>
            </div>

            {/* Right — hero lead form */}
            <div>
              <LeadCaptureForm niche={config.niche} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Listings ─────────────────────────────────── */}
      {featured && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">Featured Vendors</h2>
            <p className="text-gray-500 mt-1">Top-rated, verified providers across Washington</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((listing) => (
              <Link
                key={listing.id}
                href={`/${listing.city.toLowerCase().replace(/\s+/g, '-')}/${listing.slug}`}
                className="bg-white rounded-xl border-2 border-gray-100 hover:border-green-400 p-6 transition-all hover:shadow-lg group block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                      {listing.business_name}
                    </h3>
                    <p className="text-gray-500 text-sm">📍 {listing.city}, WA</p>
                  </div>
                  <span
                    style={{ backgroundColor: config.primaryColor }}
                    className="text-white text-xs font-bold px-2 py-1 rounded-full shrink-0"
                  >
                    FEATURED
                  </span>
                </div>

                {listing.google_rating && (
                  <div className="flex items-center gap-1 mb-3 text-sm">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">{listing.google_rating.toFixed(1)}</span>
                    <span className="text-gray-400">
                      ({listing.google_review_count?.toLocaleString()})
                    </span>
                    {listing.is_luxury && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                        ✨ Luxury
                      </span>
                    )}
                  </div>
                )}

                {listing.amenities && listing.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {listing.amenities.slice(0, 3).map((a: string) => (
                      <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {a.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Browse by City ────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Browse by City</h2>
            <p className="text-gray-500">
              Covering all major Washington State cities and counties
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayCities.map(({ city, count }) => (
              <Link
                key={city}
                href={`/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-gray-50 hover:bg-green-50 border-2 border-gray-200 hover:border-green-400 rounded-xl p-4 text-center transition-all group"
              >
                <div className="font-semibold text-gray-800 group-hover:text-green-700 text-sm">
                  {city}
                </div>
                {count > 0 && (
                  <div className="text-gray-400 text-xs mt-1">
                    {count} vendor{count !== 1 ? 's' : ''}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">How It Works</h2>
          <p className="text-gray-500">Get competing quotes in 3 simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '📋',
              title: 'Fill Out the Form',
              desc: 'Tell us about your event type, location, dates, and unit needs. Takes 2 minutes.',
            },
            {
              icon: '⚡',
              title: 'Vendors Compete',
              desc: 'Local verified vendors receive your request and send competing quotes within 2 hours.',
            },
            {
              icon: '🎯',
              title: 'Compare & Choose',
              desc: 'Review quotes, compare reviews, and pick the best vendor for your needs. No obligation.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="text-center">
              <div
                style={{ backgroundColor: `${config.primaryColor}15`, color: config.primaryColor }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              >
                {icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vendor CTA ───────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: `${config.primaryColor}08`,
          borderColor: `${config.primaryColor}25`,
        }}
        className="border-y py-12"
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{config.vendorCTA}</h2>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            Claim your free listing, receive qualified leads, and grow your Washington
            customer base. Upgrade to featured for maximum visibility.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/for-vendors"
              style={{ backgroundColor: config.primaryColor }}
              className="text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              List Your Business Free
            </Link>
            <Link
              href="/dashboard"
              style={{ borderColor: config.primaryColor, color: config.primaryColor }}
              className="border-2 font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Vendor Login
            </Link>
          </div>
        </div>
      </section>

      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: config.siteName,
            url: `https://${config.domain}`,
            description: config.tagline,
            potentialAction: {
              '@type': 'SearchAction',
              target: `https://${config.domain}/search?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
    </main>
  );
}

export const revalidate = 3600;
