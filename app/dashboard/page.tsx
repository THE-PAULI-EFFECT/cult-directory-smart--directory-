import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getConfig } from '@/lib/directory-config';

export default async function DashboardPage() {
  const supabase = createClient();
  const config = getConfig();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get vendor profile + listing
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*, listings(*)')
    .eq('id', user!.id)
    .single();

  const listing = vendor?.listings as any;

  // Get recent leads for this listing
  const { data: recentLeads, count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('listing_id', listing?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(10);

  // Stats
  const unroutedLeads = recentLeads?.filter((l) => !l.routed_to_vendor).length ?? 0;
  const paidLeads = recentLeads?.filter((l) => l.lead_paid).length ?? 0;

  if (!vendor || !listing) {
    return <ClaimListingPrompt config={config} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {listing.business_name}
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s your lead and listing activity
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/listing"
            style={{ borderColor: config.primaryColor, color: config.primaryColor }}
            className="border-2 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Edit Listing
          </Link>
          {vendor.subscription_tier !== 'featured' && (
            <Link
              href="/dashboard/upgrade"
              style={{ backgroundColor: config.primaryColor }}
              className="text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              ⭐ Upgrade to Featured
            </Link>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Leads',
            value: leadCount ?? 0,
            icon: '📋',
            color: config.primaryColor,
          },
          {
            label: 'New Leads',
            value: unroutedLeads,
            icon: '🔔',
            color: '#f59e0b',
          },
          {
            label: 'Paid Leads',
            value: paidLeads,
            icon: '💰',
            color: '#10b981',
          },
          {
            label: 'Plan',
            value: vendor.subscription_tier ?? 'Free',
            icon: '🏆',
            color: vendor.subscription_tier === 'featured' ? '#7c3aed' : '#6b7280',
          },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border-2 border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <span className="text-2xl">{icon}</span>
            </div>
            <div className="text-3xl font-extrabold" style={{ color }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          </div>
        ))}
      </div>

      {/* Listing status */}
      <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Listing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="text-gray-500 w-24 shrink-0">Name</dt>
                <dd className="text-gray-800 font-medium">{listing.business_name}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-gray-500 w-24 shrink-0">City</dt>
                <dd className="text-gray-800">{listing.city}, WA</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-gray-500 w-24 shrink-0">Phone</dt>
                <dd className="text-gray-800">{listing.phone ?? '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-gray-500 w-24 shrink-0">Status</dt>
                <dd>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      listing.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {listing.status}
                  </span>
                </dd>
              </div>
              {listing.google_rating && (
                <div className="flex gap-3">
                  <dt className="text-gray-500 w-24 shrink-0">Google</dt>
                  <dd className="text-gray-800">
                    ⭐ {listing.google_rating.toFixed(1)} ({listing.google_review_count} reviews)
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div>
            <Link
              href={`/${listing.city?.toLowerCase().replace(/\s+/g, '-')}/${listing.slug}`}
              target="_blank"
              className="text-sm font-medium hover:underline"
              style={{ color: config.primaryColor }}
            >
              View public listing →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Leads table */}
      <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Leads</h2>
          <Link
            href="/dashboard/leads"
            style={{ color: config.primaryColor }}
            className="text-sm font-medium hover:underline"
          >
            View all →
          </Link>
        </div>

        {recentLeads && recentLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Customer', 'Event', 'Date', 'Location', 'Units', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      <div className="text-gray-400">{lead.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.event_type?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.event_date
                        ? new Date(lead.event_date).toLocaleDateString()
                        : 'TBD'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.event_location}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.unit_quantity}× {lead.unit_type ?? 'any'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          lead.lead_paid
                            ? 'bg-green-100 text-green-700'
                            : lead.routed_to_vendor
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {lead.lead_paid ? '✓ Paid' : lead.routed_to_vendor ? 'Received' : 'New'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">No leads yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Leads will appear here when customers request quotes from your listing.
              {vendor.subscription_tier === 'free' && (
                <>
                  {' '}
                  <Link
                    href="/dashboard/upgrade"
                    style={{ color: config.primaryColor }}
                    className="font-medium hover:underline"
                  >
                    Upgrade to featured
                  </Link>{' '}
                  for 5× more visibility.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shown when vendor hasn't claimed a listing yet ────────────────────────────

function ClaimListingPrompt({ config }: { config: ReturnType<typeof getConfig> }) {
  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <div className="text-6xl mb-6">{config.heroEmoji}</div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
        Claim Your Listing
      </h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        You&apos;re logged in, but you haven&apos;t claimed a listing yet.
        Search for your business in the directory and click &ldquo;Claim This Listing&rdquo;
        to start receiving leads.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/for-vendors"
          style={{ backgroundColor: config.primaryColor }}
          className="text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Find & Claim My Listing
        </Link>
        <Link
          href="/"
          className="border-2 border-gray-300 font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
        >
          Browse Directory
        </Link>
      </div>
    </div>
  );
}
