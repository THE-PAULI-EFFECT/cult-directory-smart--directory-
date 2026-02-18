import { NextRequest, NextResponse } from 'next/server';

/**
 * Notify Vendor API Route
 * Calls Supabase Edge Function to send lead notification email
 * File: app/api/notify-vendor/route.ts
 */
export async function POST(request: NextRequest) {
  try {
    const { listing_id } = await request.json();

    if (!listing_id) {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400 }
      );
    }

    // Call Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/notify-vendor`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listing_id }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Edge Function error:', error);
      // Still return success to not block the form submission
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Notify vendor endpoint error:', error);
    // Silently fail — don't block lead submission
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
