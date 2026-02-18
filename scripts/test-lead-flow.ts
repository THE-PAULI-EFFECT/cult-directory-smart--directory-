#!/usr/bin/env tsx
/**
 * End-to-end lead flow test script
 * Tests: DB connection → lead insertion → routing query → analytics write
 *
 * Run: pnpm tsx scripts/test-lead-flow.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NICHE = process.env.NEXT_PUBLIC_NICHE ?? 'porta_potty';
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'wa-portapotty.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ─────────────────────────────────────────────────────────────────

function pass(label: string, detail = '') {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, err: any) {
  console.error(`  ❌ ${label}: ${err?.message ?? JSON.stringify(err)}`);
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ ${title}`);
  console.log('─'.repeat(60));
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function testDatabaseConnection() {
  section('1. Database Connection');
  const { error } = await supabase.from('listings').select('id').limit(1);
  if (error) return fail('listings table accessible', error);
  pass('listings table accessible');
}

async function testListingsTable() {
  section('2. Listings Table Schema & Data');

  const { data, error } = await supabase
    .from('listings')
    .select('id, niche, business_name, city, status, is_featured, google_rating')
    .eq('niche', NICHE)
    .limit(5);

  if (error) {
    fail('query listings by niche', error);
    return null;
  }

  pass(`found ${data.length} ${NICHE} listings`);

  if (data.length > 0) {
    const sample = data[0];
    console.log(`     Sample: "${sample.business_name}" — ${sample.city}, ${sample.status}`);
    return sample;
  }

  console.log(`  ⚠️  No listings in DB yet for niche="${NICHE}" — import data first`);
  return null;
}

async function testLeadInsertion(listingId?: string) {
  section('3. Lead Capture Form → Database');

  const testLead = {
    listing_id: listingId ?? null,
    niche: NICHE,
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '(206) 555-9999',
    event_type: 'wedding',
    event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    event_location: 'Seattle, WA',
    unit_quantity: 3,
    unit_type: 'luxury_4stall',
    duration_days: 2,
    message: '[AUTOMATED TEST — PLEASE IGNORE]',
    source_url: `https://${SITE_DOMAIN}/test`,
  };

  const { data, error } = await supabase
    .from('leads')
    .insert([testLead])
    .select()
    .single();

  if (error) {
    fail('lead insert', error);
    return null;
  }

  pass('lead inserted', `id=${data.id}`);

  // Verify it can be read back (service role)
  const { data: verify, error: verifyErr } = await supabase
    .from('leads')
    .select('id, name, routed_to_vendor')
    .eq('id', data.id)
    .single();

  if (verifyErr) {
    fail('lead read-back', verifyErr);
  } else {
    pass('lead readable', `routed_to_vendor=${verify.routed_to_vendor}`);
  }

  return data;
}

async function testLeadRouting(leadId: string) {
  section('4. Lead Routing Update');

  const { error } = await supabase
    .from('leads')
    .update({
      routed_to_vendor: true,
      routed_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (error) return fail('update routed_to_vendor', error);
  pass('lead marked as routed');
}

async function testVendorNotifyEndpoint(listingId?: string) {
  section('5. /api/notify-vendor Endpoint');

  if (!listingId) {
    console.log('  ⚠️  Skipped — no listing ID (no listings in DB yet)');
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_SITE_DOMAIN}`
    : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/notify-vendor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    });
    const body = await res.json();

    if (!res.ok) {
      fail(`notify-vendor returned ${res.status}`, body);
    } else {
      pass(`notify-vendor responded ${res.status}`, JSON.stringify(body));
    }
  } catch (err) {
    console.log(`  ⚠️  Skipped (server not running): ${(err as Error).message}`);
  }
}

async function testAnalyticsTracking() {
  section('6. Analytics Events Table');

  const { data, error } = await supabase.from('analytics_events').insert([
    {
      event_name: 'test_event',
      niche: NICHE,
      properties: { automated_test: true, timestamp: new Date().toISOString() },
    },
  ]).select().single();

  if (error) {
    fail('analytics event insert', error);
    return;
  }

  pass('analytics event logged', `id=${data.id}`);
}

async function testCityPageQuery() {
  section('7. City Page Data Query (Simulated)');

  const city = 'Seattle';

  const { data, count, error } = await supabase
    .from('listings')
    .select('id, business_name, slug, city, google_rating, is_featured', { count: 'exact' })
    .eq('niche', NICHE)
    .eq('status', 'active')
    .ilike('city', city)
    .order('is_featured', { ascending: false })
    .order('google_rating', { ascending: false })
    .limit(20);

  if (error) {
    fail('city page query', error);
    return;
  }

  pass(`city page query for "${city}"`, `found ${count ?? 0} listings`);
  if (data && data.length > 0) {
    console.log(`     Top result: "${data[0].business_name}" — ${data[0].google_rating ?? 'N/A'}⭐`);
  }
}

async function testSitemapQuery() {
  section('8. Sitemap Data Query');

  const { data, error } = await supabase
    .from('listings')
    .select('city, slug, updated_at')
    .eq('niche', NICHE)
    .eq('status', 'active')
    .limit(5);

  if (error) {
    fail('sitemap query', error);
    return;
  }

  pass(`sitemap query returned ${data.length} rows`);

  const cities = [...new Set(data.map((l) => l.city))];
  pass(`unique cities: [${cities.join(', ')}]`);
}

async function cleanupTestData() {
  section('9. Cleanup Test Data');

  const { error } = await supabase
    .from('leads')
    .delete()
    .ilike('message', '%AUTOMATED TEST%');

  if (error) {
    fail('cleanup test leads', error);
    return;
  }

  const { error: analyticsErr } = await supabase
    .from('analytics_events')
    .delete()
    .contains('properties', { automated_test: true });

  if (analyticsErr) {
    fail('cleanup analytics events', analyticsErr);
    return;
  }

  pass('test data cleaned up');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧪 NW Directory Empire — Lead Flow Test Suite');
  console.log('═'.repeat(60));
  console.log(`  Niche: ${NICHE}`);
  console.log(`  Domain: ${SITE_DOMAIN}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);

  await testDatabaseConnection();
  const listing = await testListingsTable();
  const lead = await testLeadInsertion(listing?.id);

  if (lead) {
    await testLeadRouting(lead.id);
    await testVendorNotifyEndpoint(listing?.id);
  }

  await testAnalyticsTracking();
  await testCityPageQuery();
  await testSitemapQuery();
  await cleanupTestData();

  console.log('\n═'.repeat(60));
  console.log('✅ Test suite complete. Check output above for failures.\n');
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
