import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';
import { getListingBySlug } from '@/lib/pocketbase';
import { DIRECTORY_CONFIG } from '@/lib/directory-config';

interface ListingPageProps {
  params: Promise<{ city: string; slug: string }>;
}

function deSlug(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return {};
  return {
    title: `${listing.business_name} — ${listing.city}, WA`,
    description: listing.description
      ?? `${listing.business_name} provides porta-potty rentals in ${listing.city}, WA. ⭐ ${listing.google_rating}/5. Get free quotes.`,
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { city, slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const cityName = deSlug(city);

  return (
    <main>
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <nav className="text-gray-500 text-sm mb-4">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <span className="mx-2">/</span>
            <Link href={`/${city}`} className="hover:text-green-700">{cityName}</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800">{listing.business_name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">
                {listing.business_name}
              </h1>
              <p className="text-gray-500 mb-3">
                📍 {listing.city}, WA
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {listing.google_rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-xl">⭐</span>
                    <span className="text-xl font-bold">{listing.google_rating.toFixed(1)}</span>
                    <span className="text-gray-500 text-sm">
                      ({listing.google_review_count?.toLocaleString()} reviews)
                    </span>
                  </div>
                )}
                {listing.is_luxury && (
                  <span className="bg-purple-600 text-white font-semibold px-3 py-1 rounded-lg text-sm">
                    ✨ Luxury Units
                  </span>
                )}
                {listing.is_verified && (
                  <span className="bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-lg text-sm">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              {listing.phone && (
                <a
                  href={`tel:${listing.phone}`}
                  style={{ backgroundColor: DIRECTORY_CONFIG.primaryColor }}
                  className="text-white font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  📞 Call Now
                </a>
              )}
              {listing.website && (
                <a
                  href={listing.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-green-700 text-green-700 font-bold px-5 py-3 rounded-xl hover:bg-green-50 transition-colors"
                >
                  🌐 Website
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details column */}
          <div className="lg:col-span-2 space-y-6">
            {listing.description && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {listing.unit_types && listing.unit_types.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold mb-4">Available Units</h2>
                <div className="space-y-3">
                  {listing.unit_types.map((unit, i) => (
                    <div key={i} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-bold text-gray-900">{unit.type}</div>
                        {unit.capacity && (
                          <div className="text-gray-500 text-sm">Serves up to {unit.capacity} people</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {listing.amenities && listing.amenities.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold mb-4">Amenities & Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {listing.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-gray-700">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm">
                        {a.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {listing.service_areas && listing.service_areas.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold mb-3">Service Areas</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.service_areas.map((area) => (
                    <span key={area} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {area}
                    </span>
                  ))}
                </div>
                {listing.service_radius_miles && (
                  <p className="text-gray-500 text-sm mt-3">
                    📍 Service radius: {listing.service_radius_miles} miles from {listing.city}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lead form */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <LeadCaptureForm
                listingId={listing.id}
                listingName={listing.business_name}
                city={listing.city}
              />
            </div>
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: listing.business_name,
            telephone: listing.phone,
            url: listing.website,
            address: {
              '@type': 'PostalAddress',
              addressLocality: listing.city,
              addressRegion: 'WA',
              addressCountry: 'US',
            },
            ...(listing.google_rating && {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: listing.google_rating,
                reviewCount: listing.google_review_count,
                bestRating: '5',
              },
            }),
          }),
        }}
      />
    </main>
  );
}

export const revalidate = 86400;
