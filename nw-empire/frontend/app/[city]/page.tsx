import { Metadata } from 'next';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';
import { VendorCard } from '@/components/VendorCard';
import { getListingsByCity } from '@/lib/pocketbase';
import { DIRECTORY_CONFIG } from '@/lib/directory-config';

interface CityPageProps {
  params: Promise<{ city: string }>;
}

function deSlug(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const cityName = deSlug(city);
  return {
    title: `Porta-Potty Rental ${cityName} WA | Free Quotes`,
    description: `Find verified porta-potty and restroom trailer rentals in ${cityName}, Washington. Compare vendors, read reviews, get free competing quotes within 2 hours.`,
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const cityName = deSlug(city);
  const listings = await getListingsByCity(cityName, DIRECTORY_CONFIG.niche);

  const avgRating = listings.length
    ? listings.reduce((s, l) => s + (l.google_rating ?? 0), 0) / listings.length
    : null;

  const totalReviews = listings.reduce((s, l) => s + (l.google_review_count ?? 0), 0);

  return (
    <main>
      {/* Hero */}
      <section
        style={{ background: `linear-gradient(135deg, ${DIRECTORY_CONFIG.primaryColor} 0%, ${DIRECTORY_CONFIG.secondaryColor} 100%)` }}
        className="text-white py-14"
      >
        <div className="max-w-6xl mx-auto px-4">
          <nav className="text-sm mb-4 opacity-70">
            <a href="/" className="hover:opacity-100">Home</a>
            <span className="mx-2">/</span>
            <span>{cityName}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            🚽 Porta-Potty Rentals in {cityName}, WA
          </h1>

          <p className="text-xl opacity-90 mb-5 max-w-2xl">
            {listings.length > 0
              ? `Compare ${listings.length} verified vendors. Get free quotes in 2 hours.`
              : `Submit your request and local vendors will contact you within 2 hours.`}
          </p>

          {listings.length > 0 && (
            <div className="flex flex-wrap gap-6 text-sm opacity-75">
              {avgRating && <span>⭐ {avgRating.toFixed(1)} avg rating</span>}
              {totalReviews > 0 && <span>📝 {totalReviews.toLocaleString()} reviews</span>}
              <span>✅ {listings.length} verified vendors</span>
            </div>
          )}
        </div>
      </section>

      {/* Listings + Lead form */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Listings (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {listings.length > 0 ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900">
                  {listings.length} Vendors in {cityName}
                </h2>
                {listings.map((listing) => (
                  <VendorCard
                    key={listing.id}
                    listing={listing}
                    citySlug={city}
                    primaryColor={DIRECTORY_CONFIG.primaryColor}
                  />
                ))}
              </>
            ) : (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-8 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  We&apos;re building our {cityName} vendor list
                </h2>
                <p className="text-gray-500">
                  Submit your request and we&apos;ll match you with verified vendors in your area.
                </p>
              </div>
            )}
          </div>

          {/* Sticky lead form (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <LeadCaptureForm
                city={cityName}
                listingName={listings.length > 0 ? undefined : `vendors near ${cityName}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Local SEO text */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Porta-Potty Rental in {cityName}, WA
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Finding reliable portable toilet and restroom trailer rentals in {cityName},
          Washington is easy with our verified vendor directory. Whether you need standard
          units for a construction site, ADA-accessible toilets for a public event, or luxury
          restroom trailers for a wedding, local vendors serve all of {cityName} and surrounding areas.
          Submit your request once and receive competing quotes from multiple providers within 2 hours.
        </p>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Porta-potty vendors in ${cityName}, WA`,
            numberOfItems: listings.length,
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

export const revalidate = 3600;
