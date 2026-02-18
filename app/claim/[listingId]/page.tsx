import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getConfig } from '@/lib/directory-config';

interface ClaimPageProps {
  params: { listingId: string };
}

export default async function ClaimListingPage({ params }: ClaimPageProps) {
  const supabase = createClient();
  const config = getConfig();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/claim/${params.listingId}`);
  }

  // Get listing
  const { data: listing } = await supabase
    .from('listings')
    .select('id, business_name, city, phone, email, claimed_by, status')
    .eq('id', params.listingId)
    .eq('niche', config.niche)
    .single();

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Found</h1>
        <p className="text-gray-500">This listing may have been removed.</p>
        <Link href="/for-vendors" className="mt-6 inline-block text-green-700 hover:underline">
          ← Back to vendor page
        </Link>
      </div>
    );
  }

  if (listing.claimed_by && listing.claimed_by !== user.id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Already Claimed</h1>
        <p className="text-gray-500">
          {listing.business_name} has already been claimed by another account.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          If you believe this is an error, contact{' '}
          <a href="mailto:support@wa-portapotty.com" className="text-green-700 hover:underline">
            support@wa-portapotty.com
          </a>
        </p>
        <Link href="/for-vendors" className="mt-6 inline-block text-green-700 hover:underline">
          ← Back to vendor page
        </Link>
      </div>
    );
  }

  // Already claimed by current user
  if (listing.claimed_by === user.id) {
    redirect('/dashboard');
  }

  // Show claim confirmation form
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-8 max-w-lg w-full shadow-lg">
        <div
          style={{ backgroundColor: `${config.primaryColor}10` }}
          className="rounded-xl p-4 mb-6 text-center"
        >
          <div className="text-4xl mb-2">{config.heroEmoji}</div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Claim: {listing.business_name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            📍 {listing.city}, WA
          </p>
        </div>

        <div className="space-y-3 mb-6 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span style={{ color: config.primaryColor }}>✓</span>
            <span>
              By claiming this listing, you confirm you are an authorized
              representative of <strong>{listing.business_name}</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: config.primaryColor }}>✓</span>
            <span>
              You will receive lead notifications at <strong>{user.email}</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: config.primaryColor }}>✓</span>
            <span>
              Misrepresentation will result in account termination.
            </span>
          </div>
        </div>

        {/* Server action form */}
        <form action={`/api/claim-listing`} method="POST">
          <input type="hidden" name="listing_id" value={listing.id} />
          <input type="hidden" name="redirect_to" value="/dashboard" />

          <button
            type="submit"
            style={{ backgroundColor: config.primaryColor }}
            className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity text-lg"
          >
            ✅ Confirm — Claim This Listing
          </button>
        </form>

        <p className="text-center mt-4">
          <Link
            href="/for-vendors"
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ← Cancel, go back
          </Link>
        </p>
      </div>
    </main>
  );
}
