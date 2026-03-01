import { NextRequest, NextResponse } from 'next/server';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';

/**
 * POST /api/leads
 * Server-side lead submission to PocketBase
 * Used as a fallback when client-side PB isn't available
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name || !data.email || !data.phone) {
      return NextResponse.json(
        { error: 'name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Forward to PocketBase
    const res = await fetch(`${POCKETBASE_URL}/api/collections/leads/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        source_url: request.headers.get('referer') || '',
        routed_to_vendor: false,
        created_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('PocketBase error:', err);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    const lead = await res.json();
    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error('Lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'POST /api/leads to submit a lead' });
}
