import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Analytics tracking endpoint
 * Logs events to Supabase analytics_events table
 * Called from client-side trackEvent() function
 */
export async function POST(request: NextRequest) {
  try {
    const { event, properties, timestamp } = await request.json();

    if (!event) {
      return NextResponse.json(
        { error: 'event parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Extract session ID from cookies (set by Supabase auth)
    const cookies = request.headers.get('cookie');
    const sessionId = cookies
      ?.split(';')
      .find((c) => c.trim().startsWith('sb-'))
      ?.split('=')[1];

    // Insert event into analytics table
    const { error } = await supabase.from('analytics_events').insert([
      {
        event_name: event,
        properties,
        session_id: sessionId,
        niche: process.env.NEXT_PUBLIC_NICHE,
        created_at: timestamp || new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Analytics tracking error:', error);
      // Don't fail the user experience — silently log
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Track endpoint error:', error);
    // Always return 200 to avoid blocking client
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
