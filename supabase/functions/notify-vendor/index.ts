import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
      });
    }

    const { listing_id } = await req.json();

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: 'listing_id is required' }),
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get listing info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('business_name, email, phone, city')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      console.error('Listing not found:', listingError);
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
      });
    }

    // Get most recent lead for this listing
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('listing_id', listing_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404,
      });
    }

    // Skip if no email address
    if (!listing.email) {
      console.log('No email address for listing', listing_id);
      return new Response(JSON.stringify({ success: true, message: 'No email on file' }), {
        status: 200,
      });
    }

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'leads@wa-portapotty.com',
        to: listing.email,
        subject: `🚨 New Lead: ${lead.event_type} in ${lead.event_location} — ${lead.event_date || 'ASAP'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; border-radius: 12px; padding: 24px; border: 2px solid #059669;">
              <h2 style="color: #1a6b3c; margin-top: 0;">🚨 New Quote Request from WA Porta Potty Directory</h2>

              <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 12px; margin: 20px 0;">
                <p style="margin: 0; color: #166534;">
                  <strong>⏱️ IMPORTANT:</strong> Contact this customer within 2 hours for best results.
                </p>
              </div>

              <h3 style="color: #1a6b3c; margin-top: 20px;">Customer Contact Info:</h3>
              <ul style="background-color: #f3f4f6; padding: 12px 20px; border-radius: 8px; list-style: none; margin: 0;">
                <li style="padding: 4px 0;"><strong>Name:</strong> ${lead.name}</li>
                <li style="padding: 4px 0;"><strong>Phone:</strong> <a href="tel:${lead.phone}" style="color: #059669; text-decoration: none;">${lead.phone}</a></li>
                <li style="padding: 4px 0;"><strong>Email:</strong> <a href="mailto:${lead.email}" style="color: #059669; text-decoration: none;">${lead.email}</a></li>
              </ul>

              <h3 style="color: #1a6b3c; margin-top: 20px;">Event Details:</h3>
              <ul style="background-color: #f3f4f6; padding: 12px 20px; border-radius: 8px; list-style: none; margin: 0;">
                <li style="padding: 4px 0;"><strong>Type:</strong> ${lead.event_type?.replace(/_/g, ' ')}</li>
                <li style="padding: 4px 0;"><strong>Date:</strong> ${lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'ASAP / TBD'}</li>
                <li style="padding: 4px 0;"><strong>Location:</strong> ${lead.event_location}</li>
                <li style="padding: 4px 0;"><strong>Units Needed:</strong> ${lead.unit_quantity} × ${lead.unit_type || 'any type'}</li>
                <li style="padding: 4px 0;"><strong>Duration:</strong> ${lead.duration_days} day(s)</li>
              </ul>

              ${lead.message ? `
                <h3 style="color: #1a6b3c; margin-top: 20px;">Special Requirements:</h3>
                <p style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; margin: 0;">
                  ${lead.message}
                </p>
              ` : ''}

              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
                <p style="margin: 0;">
                  This lead was sent to you because your listing on WA Porta Potty Directory matched the customer's search.
                </p>
                <p style="margin: 8px 0 0 0;">
                  <a href="https://wa-portapotty.com/dashboard" style="color: #059669; text-decoration: none;">Manage your listing →</a>
                </p>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Resend API error: ${emailResponse.status}`);
    }

    // Mark lead as routed
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        routed_to_vendor: true,
        routed_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('Error marking lead as routed:', updateError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in notify-vendor function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
