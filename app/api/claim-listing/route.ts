import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/claim-listing
 * Claims a listing for the authenticated user
 * Creates a vendor record linking user → listing
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const formData = await request.formData();
    const listingId = formData.get('listing_id') as string;
    const redirectTo = (formData.get('redirect_to') as string) ?? '/dashboard';

    if (!listingId) {
      return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
    }

    // Verify listing exists and is unclaimed
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, business_name, claimed_by')
      .eq('id', listingId)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.claimed_by && listing.claimed_by !== user.id) {
      return NextResponse.json({ error: 'Listing already claimed' }, { status: 409 });
    }

    // Claim the listing
    const { error: claimErr } = await supabase
      .from('listings')
      .update({
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', listingId);

    if (claimErr) throw claimErr;

    // Create or update vendor record
    const { error: vendorErr } = await supabase.from('vendors').upsert(
      {
        id: user.id,
        listing_id: listingId,
        business_name: listing.business_name,
        subscription_tier: 'free',
        verified: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (vendorErr) {
      console.error('Vendor upsert error (non-fatal):', vendorErr);
    }

    // Log touchpoint
    await supabase.from('vendor_touchpoints').insert([
      {
        vendor_id: user.id,
        listing_id: listingId,
        touchpoint_type: 'claimed_listing',
        message: `${listing.business_name} claimed via web`,
      },
    ]);

    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('Claim listing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
