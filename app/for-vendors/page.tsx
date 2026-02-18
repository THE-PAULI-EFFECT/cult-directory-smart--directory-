import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getConfig } from '@/lib/directory-config';

export default async function ForVendorsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const config = getConfig();
  const supabase = createClient();

  // Search for unclaimed listings matching the query
  let searchResults: any[] = [];
  if (searchParams.q) {
    const { data } = await supabase
      .from('listings')
      .select('id, business_name, city, zip, phone, google_rating, google_review_count, claimed_by, slug')
      .eq('niche', config.niche)
      .eq('status', 'active')
      .ilike('business_name', `%${searchParams.q}%`)
      .limit(10);

    searchResults = data ?? [];
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section
        style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` }}
        className="text-white py-16"
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            {config.vendorCTA}
          </h1>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Claim your free listing to receive qualified leads, manage your profile,
            and grow your Washington customer base.
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm opacity-80">
            <span>✅ Free to claim</span>
            <span>⚡ Start getting leads immediately</span>
            <span>⭐ Featured upgrades available</span>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-10">
          Why Vendors List With Us
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '📋',
              title: 'Get Qualified Leads',
              desc: 'Customers with real events submit quote requests directly to you. No cold calls.',
              tier: 'Free & Featured',
            },
            {
              icon: '⭐',
              title: 'Featured Placement',
              desc: 'Appear at the top of city searches, homepage, and recommended lists for $79/month.',
              tier: 'Featured Only',
            },
            {
              icon: '📊',
              title: 'Lead Dashboard',
              desc: 'See customer details, event info, and track your lead history in one place.',
              tier: 'Free & Featured',
            },
            {
              icon: '🛡️',
              title: 'Verified Badge',
              desc: 'Get a verified badge after we confirm your business info and reviews.',
              tier: 'All Tiers',
            },
            {
              icon: '📍',
              title: 'Google-Verified Reviews',
              desc: 'Your real Google rating and review count displays on your listing.',
              tier: 'All Tiers',
            },
            {
              icon: '💰',
              title: 'Pay Per Lead',
              desc: `Only pay when you receive a qualified lead. No monthly contracts required.`,
              tier: 'Pay-Per-Lead',
            },
          ].map(({ icon, title, desc, tier }) => (
            <div
              key={title}
              className="bg-white rounded-xl border-2 border-gray-100 p-6"
            >
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
              <p className="text-gray-500 text-sm mb-3">{desc}</p>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {tier}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white border-y border-gray-200 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-10">
            Simple, Transparent Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Free Listing',
                price: '$0/month',
                features: [
                  'Basic directory listing',
                  'Google reviews displayed',
                  'Contact info visible',
                  'Lead form enabled',
                  'Pay $25 per lead received',
                ],
                cta: 'Claim Free Listing',
                featured: false,
              },
              {
                name: 'Featured',
                price: '$79/month',
                features: [
                  'Top placement in city searches',
                  'Featured on homepage',
                  'All Free features',
                  'Priority lead routing',
                  '10 free leads/month included',
                  'Verified badge',
                ],
                cta: 'Get Featured',
                featured: true,
              },
              {
                name: 'Premium',
                price: '$199/month',
                features: [
                  'All Featured benefits',
                  'Luxury/specialty badge',
                  'Video ad creation',
                  'Unlimited free leads/month',
                  'Dedicated account manager',
                  'Priority support',
                ],
                cta: 'Go Premium',
                featured: false,
              },
            ].map(({ name, price, features, cta, featured }) => (
              <div
                key={name}
                className={`rounded-xl border-2 p-6 ${
                  featured
                    ? 'shadow-xl scale-105'
                    : 'border-gray-100'
                }`}
                style={featured ? { borderColor: config.primaryColor } : {}}
              >
                {featured && (
                  <div
                    style={{ backgroundColor: config.primaryColor }}
                    className="text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3"
                  >
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>
                <div className="text-2xl font-extrabold text-gray-900 mb-4">{price}</div>
                <ul className="space-y-2 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span style={{ color: config.primaryColor }} className="mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  style={featured ? { backgroundColor: config.primaryColor } : {}}
                  className={`block text-center font-bold py-3 rounded-xl transition-opacity ${
                    featured
                      ? 'text-white hover:opacity-90'
                      : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Claim your listing — search */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            Find & Claim Your Listing
          </h2>
          <p className="text-gray-500">
            Search for your business name below to claim it.
          </p>
        </div>

        <form method="get" className="flex gap-3 mb-8">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search your business name..."
            className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
          />
          <button
            type="submit"
            style={{ backgroundColor: config.primaryColor }}
            className="text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </form>

        {/* Search results */}
        {searchParams.q && (
          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No results for &ldquo;{searchParams.q}&rdquo;
                </p>
                <p className="text-sm text-gray-400">
                  Not listed yet?{' '}
                  <Link
                    href="/login"
                    style={{ color: config.primaryColor }}
                    className="font-medium hover:underline"
                  >
                    Create an account
                  </Link>{' '}
                  and we&apos;ll add you.
                </p>
              </div>
            ) : (
              searchResults.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white border-2 border-gray-100 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-gray-900">{listing.business_name}</div>
                    <div className="text-sm text-gray-500">
                      📍 {listing.city}, WA{listing.zip ? ` ${listing.zip}` : ''}
                      {listing.google_rating
                        ? ` · ⭐ ${listing.google_rating.toFixed(1)} (${listing.google_review_count})`
                        : ''}
                    </div>
                  </div>
                  <div>
                    {listing.claimed_by ? (
                      <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-medium">
                        Already Claimed
                      </span>
                    ) : (
                      <Link
                        href={`/claim/${listing.id}`}
                        style={{ backgroundColor: config.primaryColor }}
                        className="text-white font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Claim This Listing
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
