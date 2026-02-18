import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getConfig } from '@/lib/directory-config';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';

interface ListingPageProps {
  params: { city: string; slug: string };
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: listing } = await supabase
    .from('listings')
    .select('business_name, city, google_rating, google_review_count, description')
    .eq('slug', params.slug)
    .single();

  if (!listing) return {};

  return {
    title: `${listing.business_name} — ${listing.city}, WA | Get a Free Quote`,
    description:
      listing.description ??
      `${listing.business_name} serves ${listing.city}, WA. ⭐ ${listing.google_rating}/5 from ${listing.google_review_count} reviews. Get your free quote today.`,
    openGraph: {
      title: `${listing.business_name} — ${listing.city}, WA`,
      description: `⭐ ${listing.google_rating}/5 · ${listing.google_review_count} reviews · Serving ${listing.city}, WA`,
    },
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const config = getConfig();
  const supabase = createClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', params.slug)
    .eq('niche', config.niche)
    .single();

  if (!listing) notFound();

  const images: Array<{ url: string; alt?: string }> =
    Array.isArray(listing.images) ? listing.images : [];

  const unitTypes: Array<{ type: string; capacity?: number; features?: string[] }> = (() => {
    try {
      return typeof listing.unit_types === 'string'
        ? JSON.parse(listing.unit_types)
        : listing.unit_types ?? [];
    } catch {
      return [];
    }
  })();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="text-gray-500 text-sm mb-4">
            <Link href="/" className="hover:text-green-700">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/${params.city}`} className="hover:text-green-700">
              {listing.city}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800">{listing.business_name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Name & location */}
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">
                {listing.business_name}
              </h1>
              <p className="text-gray-500 mb-3">
                📍 {[listing.address, listing.city, 'WA', listing.zip]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {listing.google_rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-xl">⭐</span>
                    <span className="text-xl font-bold">
                      {listing.google_rating.toFixed(1)}
                    </span>
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

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 shrink-0">
              {listing.phone && (
                <a
                  href={`tel:${listing.phone}`}
                  style={{ backgroundColor: config.primaryColor }}
                  className="hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-center transition-opacity"
                >
                  📞 Call Now
                </a>
              )}
              {listing.website && (
                <a
                  href={listing.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ borderColor: config.primaryColor, color: config.primaryColor }}
                  className="border-2 hover:opacity-80 font-bold px-6 py-3 rounded-xl transition-opacity"
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
          {/* Left column — details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo gallery */}
            {images.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.slice(0, 6).map((img, i) => (
                    <div
                      key={i}
                      className="relative aspect-video rounded-xl overflow-hidden border border-gray-200"
                    >
                      <Image
                        src={img.url}
                        alt={img.alt ?? listing.business_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Unit types */}
            {unitTypes.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Available Units</h2>
                <div className="space-y-3">
                  {unitTypes.map((unit, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h3 className="font-bold text-gray-900">{unit.type}</h3>
                        {unit.capacity && (
                          <p className="text-gray-500 text-sm">
                            Serves up to {unit.capacity} people
                          </p>
                        )}
                        {unit.features && unit.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {unit.features.map((f) => (
                              <span
                                key={f}
                                className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Amenities & Features
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {listing.amenities.map((amenity: string) => (
                    <div key={amenity} className="flex items-center gap-2 text-gray-700">
                      <span style={{ color: config.primaryColor }}>✓</span>
                      <span className="text-sm">
                        {amenity
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service areas */}
            {listing.service_areas && listing.service_areas.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Service Areas</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.service_areas.map((area: string) => (
                    <span
                      key={area}
                      style={{ backgroundColor: `${config.primaryColor}15`, color: config.primaryColor }}
                      className="px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {area}
                    </span>
                  ))}
                </div>
                {listing.service_radius_miles && (
                  <p className="text-gray-500 text-sm mt-3">
                    📍 Service radius: {listing.service_radius_miles} miles from{' '}
                    {listing.city}
                  </p>
                )}
              </div>
            )}

            {/* Contact card */}
            <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>
              <dl className="space-y-3 text-sm">
                {listing.phone && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-16">Phone</dt>
                    <dd>
                      <a
                        href={`tel:${listing.phone}`}
                        style={{ color: config.primaryColor }}
                        className="font-semibold hover:underline"
                      >
                        {listing.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {listing.website && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-16">Website</dt>
                    <dd>
                      <a
                        href={listing.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: config.primaryColor }}
                        className="hover:underline"
                      >
                        {listing.website.replace(/^https?:\/\//, '')}
                      </a>
                    </dd>
                  </div>
                )}
                {listing.city && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-16">Location</dt>
                    <dd className="text-gray-700">
                      {listing.city}, WA {listing.zip}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Right column — sticky lead form */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <LeadCaptureForm
                listingId={listing.id}
                listingName={listing.business_name}
                niche={config.niche}
                city={listing.city}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Schema.org LocalBusiness */}
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
              streetAddress: listing.address,
              addressLocality: listing.city,
              addressRegion: 'WA',
              postalCode: listing.zip,
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
            ...(listing.lat &&
              listing.lng && {
                geo: {
                  '@type': 'GeoCoordinates',
                  latitude: listing.lat,
                  longitude: listing.lng,
                },
              }),
          }),
        }}
      />
    </main>
  );
}

export const revalidate = 86400;
