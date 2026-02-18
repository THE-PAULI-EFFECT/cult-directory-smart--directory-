#!/usr/bin/env tsx
/**
 * Step 4: Import Enriched Listings to Supabase
 * -----------------------------------------------
 * Upserts enriched listing data into the listings table.
 * Uses slug as the unique conflict key so re-runs are safe.
 *
 * Usage:
 *   pnpm tsx scripts/pipeline/04_import_supabase.ts --niche porta_potty
 *
 * Input:  data/enriched/porta_potty_wa_enriched.json
 * Output: Supabase listings table
 *
 * Safe to re-run — uses upsert on slug column.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const NICHE = process.argv.find((a) => a.startsWith('--niche='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--niche') + 1]
  ?? 'porta_potty';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50; // Supabase upsert batch size

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Transform enriched data → Supabase row ────────────────────────────────────

function toSupabaseRow(listing: Record<string, any>) {
  return {
    niche: listing.niche,
    business_name: listing.business_name?.trim() || null,
    slug: listing.slug,
    address: listing.address?.trim() || null,
    city: listing.city?.trim() || null,
    state: 'Washington',
    zip: listing.zip?.trim() || null,
    lat: listing.lat ? parseFloat(listing.lat) : null,
    lng: listing.lng ? parseFloat(listing.lng) : null,
    phone: listing.phone?.trim() || null,
    website: listing.website?.trim() || null,
    email: listing.email?.trim() || null,
    google_rating: listing.google_rating ? parseFloat(listing.google_rating) : null,
    google_review_count: listing.google_review_count ? parseInt(listing.google_review_count) : 0,
    unit_types: Array.isArray(listing.unit_types) ? JSON.stringify(listing.unit_types) : null,
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    service_areas: Array.isArray(listing.service_areas) ? listing.service_areas : [],
    service_radius_miles: listing.service_radius_miles ? parseInt(listing.service_radius_miles) : null,
    images: [],
    description: listing.description?.trim() || null,
    is_luxury: listing.is_luxury === true || listing.is_luxury === 'true' || false,
    is_featured: false,
    is_verified: false,
    listing_tier: 'free',
    status: listing.status || 'active',
    scrape_source: listing.scrape_source || 'outscraper',
    enriched_at: listing.enriched_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateRow(row: Record<string, any>): string[] {
  const errors: string[] = [];
  if (!row.business_name) errors.push('Missing business_name');
  if (!row.slug) errors.push('Missing slug');
  if (!row.niche) errors.push('Missing niche');
  if (!row.city) errors.push('Missing city');
  return errors;
}

// ── Import Function ───────────────────────────────────────────────────────────

async function importBatch(rows: Record<string, any>[], batchNum: number, total: number) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upsert ${rows.length} rows`);
    return { error: null };
  }

  const { error } = await supabase
    .from('listings')
    .upsert(rows, {
      onConflict: 'slug',
      ignoreDuplicates: false, // Update existing rows
    });

  if (error) {
    console.error(`  ❌ Batch ${batchNum} failed: ${error.message}`);
  } else {
    console.log(`  ✅ Batch ${batchNum}/${total}: ${rows.length} rows upserted`);
  }

  return { error };
}

// ── Verify Import ─────────────────────────────────────────────────────────────

async function verifyImport(expectedCount: number) {
  const { count, error } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('niche', NICHE)
    .eq('status', 'active');

  if (error) {
    console.error(`  ⚠️  Could not verify: ${error.message}`);
    return;
  }

  console.log(`\n📊 Verification: ${count} active ${NICHE} listings in Supabase`);
  if (count && count < expectedCount * 0.8) {
    console.warn(`  ⚠️  Expected ~${expectedCount}, got ${count}. Some imports may have failed.`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const inputFile = path.join('data', 'enriched', `${NICHE}_wa_enriched.json`);

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input not found: ${inputFile}`);
    console.error(`   Run: pnpm tsx scripts/pipeline/03_enrich_claude.ts --niche ${NICHE}`);
    process.exit(1);
  }

  const listings: Record<string, any>[] = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  console.log(`\n📤 Importing ${listings.length} ${NICHE} listings to Supabase`);
  if (DRY_RUN) console.log('   [DRY RUN MODE — no data will be written]');
  console.log(`   URL: ${SUPABASE_URL}`);

  // Transform + validate all rows
  const rows: Record<string, any>[] = [];
  const skipped: string[] = [];

  for (const listing of listings) {
    const row = toSupabaseRow(listing);
    const errors = validateRow(row);

    if (errors.length > 0) {
      skipped.push(`${listing.business_name ?? 'Unknown'}: ${errors.join(', ')}`);
      continue;
    }

    rows.push(row);
  }

  console.log(`\n  Valid: ${rows.length} | Skipped: ${skipped.length}`);
  if (skipped.length > 0) {
    console.log('  Skipped:');
    skipped.slice(0, 5).forEach((s) => console.log(`    - ${s}`));
    if (skipped.length > 5) console.log(`    ... and ${skipped.length - 5} more`);
  }

  // Batch import
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
  console.log(`\n  Importing in ${totalBatches} batches of ${BATCH_SIZE}...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const { error } = await importBatch(batch, batchNum, totalBatches);

    if (error) {
      errorCount += batch.length;
    } else {
      successCount += batch.length;
    }

    // Rate limit
    if (i + BATCH_SIZE < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Upserted: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Skipped: ${skipped.length}`);

  if (!DRY_RUN) {
    await verifyImport(successCount);
  }

  console.log(`\n🎉 Pipeline complete for niche="${NICHE}"!`);
  console.log(`   Next steps:`);
  console.log(`   1. Run test: pnpm tsx scripts/test-lead-flow.ts`);
  console.log(`   2. Submit sitemap: https://${process.env.NEXT_PUBLIC_SITE_DOMAIN}/sitemap.xml`);
  console.log(`   3. Mark some as featured: UPDATE listings SET is_featured=true WHERE ... LIMIT 20;`);
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
