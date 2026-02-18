import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getConfig } from '@/lib/directory-config';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';

interface CityPageProps {
  params: { city: string };
}

function deSlug(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function generateStaticParams() {
  const supabase = createClient();
  const config = getConfig();

  const { data } = await supabase
    .from('listings')
    .select('city')
    .eq('niche', config.niche)
    .eq('status', 'active');

  const cities = [...new Set(data?.map((l) => l.city) ?? [])];
  return cities.map((city) => ({
    city: city.toLowerCase().replace(/\s+/g, '-'),
  }));
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const config = getConfig();
  const cityName = deSlug(params.city);

  return {
    title: `${config.heroEmoji} ${config.siteName} — ${cityName}, WA | Free Quotes`,
    description: `Compare verified ${config.niche.replace(/_/g, '-')} vendors in ${cityName}, Washington. Read reviews, compare pricing, and get free competing quotes in 2 hours.`,
    openGraph: {
      title: `${config.siteName} — ${cityName}, WA`,
      description: `Find the best ${config.niche.replace(/_/g, ' ')} vendors in ${cityName}, WA.`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const config = getConfig();
  const supabase = createClient();
  const cityName = deSlug(params.city);

  const { data: listings, count } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('niche', config.niche)
    .eq('status', 'active')
    .ilike('city', cityName)
    .order('is_featured', { ascending: false })
    .order('google_rating', { ascending: false });

  if (!listings || listings.length === 0) {
    notFound();
  }

  const avgRating =
    listings.reduce((sum, l) => sum + (l.google_rating ?? 0), 0) / listings.length;

  const totalReviews = listings.reduce(
    (sum, l) => sum + (l.google_review_count ?? 0),
    0
  );

  const primaryBg = config.primaryColor;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section style={{ background: `linear-gradient(135deg, ${primaryBg} 0%, ${config.secondaryColor} 100%)` }}
        className="text-white py-16"
      >
        <div className="max-w-6xl mx-auto px-4">
          <nav className="text-sm mb-4 opacity-75">
            <Link href="/" className="hover:opacity-100">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>{cityName}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            {config.heroEmoji} {config.niche.replace(/_/g, '-').replace(/\b\w/g, l => l.toUpperCase())} Rentals in {cityName}, WA
          </h1>

          <p className="text-xl mb-6 max-w-3xl opacity-90">
            Compare <strong>{count}+ verified vendors</strong> serving {cityName}{' '}
            and surrounding areas. Get free competing quotes in 2 hours.
          </p>

          <div className="flex flex-wrap gap-6 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <span>⭐</span>
              <span>{avgRating.toFixed(1)} avg rating</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span>{totalReviews.toLocaleString()} reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{count} verified vendors</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main content: listings + sticky lead form */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Listings (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {count} Vendors in {cityName}
              </h2>
              <span className="text-sm text-gray-500">Sorted: Featured · Highest Rated</span>
            </div>

            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/${params.city}/${listing.slug}`}
                className="block bg-white border-2 border-gray-200 hover:border-green-400 rounded-xl p-6 transition-all hover:shadow-lg group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                      {listing.business_name}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                      📍 {listing.city}, WA
                      {listing.service_radius_miles
                        ? ` · serves ${listing.service_radius_miles}mi radius`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {listing.is_featured && (
                      <span
                        style={{ backgroundColor: config.primaryColor }}
                        className="text-white text-xs font-bold px-3 py-1 rounded-full"
                      >
                        FEATURED
                      </span>
                    )}
                    {listing.is_luxury && (
                      <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded">
                        ✨ Luxury
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating */}
                {listing.google_rating && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">{listing.google_rating.toFixed(1)}</span>
                    <span className="text-gray-500 text-sm">
                      ({listing.google_review_count?.toLocaleString()} reviews)
                    </span>
                  </div>
                )}

                {/* Amenities */}
                {listing.amenities && listing.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities.slice(0, 5).map((amenity: string) => (
                      <span
                        key={amenity}
                        className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                      >
                        {amenity.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {listing.amenities.length > 5 && (
                      <span className="text-gray-400 text-xs px-2 py-1">
                        +{listing.amenities.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Sticky lead form (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <LeadCaptureForm niche={config.niche} city={cityName} />
            </div>
          </div>
        </div>
      </section>

      {/* Local SEO content block */}
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            About {config.siteName} in {cityName}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Finding reliable vendors in {cityName}, Washington has never been easier.
            Our directory lists {count} verified providers serving {cityName} and
            surrounding communities. All listings include verified Google reviews,
            contact information, and service details.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Use the quote form to get free, no-obligation pricing from multiple local
            vendors. Most customers receive 2–4 quotes within 2 hours. Compare prices,
            read reviews, and choose the best fit for your needs.
          </p>
        </div>
      </section>

      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${config.niche.replace(/_/g, ' ')} vendors in ${cityName}, WA`,
            numberOfItems: count,
            itemListElement: listings.slice(0, 10).map((l, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'LocalBusiness',
                name: l.business_name,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: l.city,
                  addressRegion: 'WA',
                  addressCountry: 'US',
                },
                ...(l.google_rating && {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: l.google_rating,
                    reviewCount: l.google_review_count,
                  },
                }),
              },
            })),
          }),
        }}
      />
    </main>
  );
}

export const revalidate = 86400; // ISR: revalidate every 24 hours
