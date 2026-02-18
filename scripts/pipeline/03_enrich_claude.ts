#!/usr/bin/env tsx
/**
 * Step 3: Claude AI Enrichment Pipeline
 * ----------------------------------------
 * For each cleaned listing, calls Claude to:
 *   - Infer unit types and capacities
 *   - Extract amenities from website/subtypes text
 *   - Determine service areas
 *   - Write an SEO-optimized description
 *   - Score luxury status
 *
 * Usage:
 *   pnpm tsx scripts/pipeline/03_enrich_claude.ts --niche porta_potty
 *
 * Input:  data/cleaned/porta_potty_wa_cleaned.csv
 * Output: data/enriched/porta_potty_wa_enriched.json
 *
 * Cost: ~$0.003 per listing (haiku model)
 * Time: ~2s per listing; ~500 listings ≈ 17 minutes
 */

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const NICHE = process.argv.find((a) => a.startsWith('--niche='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--niche') + 1]
  ?? 'porta_potty';
const BATCH_SIZE = 5; // Concurrent Claude calls
const DELAY_MS = 500; // Delay between batches

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set in .env.local');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── Niche-specific enrichment prompts ─────────────────────────────────────────

const ENRICHMENT_PROMPTS: Record<string, string> = {
  porta_potty: `You are a data enrichment specialist for a Washington State porta-potty directory.

Given this business listing data, extract and infer:

1. unit_types (JSON array): Types of units offered, infer from name/subtypes if not explicit
   Each item: { type: string, capacity: number, features: string[] }
   Types: "Standard Porta-Potty", "Deluxe with Sink", "2-Stall Luxury Trailer", "4-Stall Luxury Trailer", "6-Stall Luxury Trailer", "ADA Accessible", "Construction Restroom"

2. amenities (string array): From these options only:
   running_water, hand_sanitizer, flushing_toilet, air_conditioning, heating, lighting, mirror, baby_changing, ada_compliant, solar_powered, fresh_water_tank, waste_tank_pump_out, weekly_service, weekend_service, same_day_delivery, event_specialist, construction_specialist

3. service_areas (string array): Washington cities/counties they likely serve, infer from city + "serving area" context
   List 5-10 cities/areas

4. service_radius_miles (number): Estimated service radius in miles

5. description (string): 2-3 sentence SEO-optimized description for their listing page.
   Include city, key unit types, and what makes them stand out.
   Do NOT make up specific prices.

6. is_luxury (boolean): true if they likely offer luxury/trailer units

Return ONLY valid JSON, no markdown. Example:
{
  "unit_types": [{"type": "Standard Porta-Potty", "capacity": 50, "features": ["hand_sanitizer"]}],
  "amenities": ["running_water", "ada_compliant"],
  "service_areas": ["Seattle", "Bellevue", "Kirkland"],
  "service_radius_miles": 50,
  "description": "ABC Portables serves the greater Seattle metro area...",
  "is_luxury": false
}`,

  senior_living: `You are a data enrichment specialist for a Washington State senior living directory.

Given this business listing data, extract and infer:

1. unit_types (JSON array): Care levels offered
   Each item: { type: string, capacity: number, features: string[] }
   Types: "Independent Living", "Assisted Living", "Memory Care", "Respite Care", "Adult Family Home", "Skilled Nursing"

2. amenities (string array): From these options only:
   24_hour_care, dementia_care, medication_management, physical_therapy, occupational_therapy, nutritional_meals, transportation, activities_program, pet_friendly, private_rooms, garden, memory_care_unit, respite_care, hospice_care

3. service_areas (string array): Washington cities served

4. description (string): 2-3 sentence description highlighting care type and community atmosphere

5. is_luxury (boolean): true if high-end/premium community

Return ONLY valid JSON.`,

  ada_bathroom: `You are a data enrichment specialist for a Washington State ADA bathroom contractor directory.

Given this business listing data, extract and infer:

1. unit_types (JSON array): Types of work offered
   Types: "ADA Bathroom Remodel", "Accessible Shower Install", "Grab Bar Installation", "Roll-In Shower", "Accessible Toilet", "Full Bathroom Renovation"

2. amenities (string array): From these options only:
   licensed_bonded, free_estimates, senior_discount, va_approved, ada_certified, bathroom_design, grab_bars, roll_in_shower, comfort_height_toilet, walk_in_tub, handheld_shower, floor_texture

3. service_areas (string array): Washington cities served

4. description (string): 2-3 sentence description

5. is_luxury (boolean): true if high-end remodeler

Return ONLY valid JSON.`,

  water_quality: `You are a data enrichment specialist for a Washington State water quality directory.

Given this business listing data, extract and infer:

1. unit_types (JSON array): Services offered
   Types: "Water Quality Test", "Well Water Test", "Lead Test", "Bacteria Test", "Full Panel Test", "Water Filtration Install", "Reverse Osmosis System", "Water Softener"

2. amenities (string array): From these options only:
   certified_lab, epa_certified, state_certified, same_week_results, free_collection, at_home_testing, well_water_specialist, municipal_water, filtration_install, free_consultation, online_results

3. service_areas (string array): Washington cities served

4. description (string): 2-3 sentence description

5. is_luxury (boolean): false (N/A for this niche)

Return ONLY valid JSON.`,

  event_rentals: `You are a data enrichment specialist for a Washington State event rental directory.

Given this business listing data, extract and infer:

1. unit_types (JSON array): Equipment categories offered
   Types: "Tents & Canopies", "Tables & Chairs", "Linens", "Audio/Visual", "Lighting", "Dance Floors", "Catering Equipment", "Staging", "Generators", "Photo Booths"

2. amenities (string array): From these options only:
   delivery_setup, pickup, weekend_rates, corporate_events, weddings, festival_specialist, same_day_available, insurance_provided, licensed_bonded, free_consultation, custom_packages

3. service_areas (string array): Washington cities served

4. description (string): 2-3 sentence description

5. is_luxury (boolean): true if high-end/luxury event equipment

Return ONLY valid JSON.`,
};

// ── Enrichment Function ────────────────────────────────────────────────────────

interface RawListing {
  business_name: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  google_rating: number;
  google_review_count: number;
  raw_subtypes: string;
  slug: string;
  [key: string]: any;
}

interface EnrichedListing extends RawListing {
  unit_types: any[];
  amenities: string[];
  service_areas: string[];
  service_radius_miles: number;
  description: string;
  is_luxury: boolean;
  enriched_at: string;
  enrichment_error?: string;
}

async function enrichListing(
  listing: RawListing,
  niche: string
): Promise<EnrichedListing> {
  const systemPrompt = ENRICHMENT_PROMPTS[niche] ?? ENRICHMENT_PROMPTS.porta_potty;

  const userMessage = `
Business Name: ${listing.business_name}
City: ${listing.city}, WA
Phone: ${listing.phone || 'Unknown'}
Website: ${listing.website || 'None listed'}
Google Rating: ${listing.google_rating ?? 'Unknown'} (${listing.google_review_count ?? 0} reviews)
Business Categories/Subtypes: ${listing.raw_subtypes || 'Unknown'}
  `.trim();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Fast & cheap for bulk enrichment
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Parse JSON from response
    const json = content.text
      .replace(/^```json\n?/, '')
      .replace(/```$/, '')
      .trim();

    const enriched = JSON.parse(json);

    return {
      ...listing,
      unit_types: enriched.unit_types ?? [],
      amenities: enriched.amenities ?? [],
      service_areas: enriched.service_areas ?? [listing.city],
      service_radius_miles: enriched.service_radius_miles ?? 50,
      description: enriched.description ?? '',
      is_luxury: enriched.is_luxury ?? false,
      enriched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`  ⚠️  Enrichment failed for ${listing.business_name}: ${(error as Error).message}`);
    return {
      ...listing,
      unit_types: [],
      amenities: [],
      service_areas: [listing.city],
      service_radius_miles: 50,
      description: `${listing.business_name} serves ${listing.city}, WA and surrounding areas.`,
      is_luxury: listing.is_luxury ?? false,
      enriched_at: new Date().toISOString(),
      enrichment_error: (error as Error).message,
    };
  }
}

// ── Batched Processing ────────────────────────────────────────────────────────

async function processBatch(
  listings: RawListing[],
  niche: string
): Promise<EnrichedListing[]> {
  return Promise.all(listings.map((l) => enrichListing(l, niche)));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const inputFile = path.join('data', 'cleaned', `${NICHE}_wa_cleaned.csv`);
  const outputDir = path.join('data', 'enriched');
  const outputFile = path.join(outputDir, `${NICHE}_wa_enriched.json`);

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input not found: ${inputFile}`);
    console.error(`   Run: python scripts/pipeline/02_clean_normalize.py --niche ${NICHE}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // Parse CSV manually (no pandas in Node)
  const csv = fs.readFileSync(inputFile, 'utf-8');
  const lines = csv.split('\n').filter((l) => l.trim());
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

  const listings: RawListing[] = lines.slice(1).map((line) => {
    // Handle quoted values with commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj as RawListing;
  });

  console.log(`\n🤖 Enriching ${listings.length} ${NICHE} listings with Claude`);
  console.log(`   Batch size: ${BATCH_SIZE} | Estimated time: ${Math.ceil(listings.length / BATCH_SIZE * 2)}s`);
  console.log(`   Estimated cost: ~$${(listings.length * 0.003).toFixed(2)}\n`);

  // Load existing output to allow resuming
  let enriched: EnrichedListing[] = [];
  const processedSlugs = new Set<string>();

  if (fs.existsSync(outputFile)) {
    enriched = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    enriched.forEach((e) => processedSlugs.add(e.slug));
    console.log(`  Resuming: ${enriched.length} already processed\n`);
  }

  const toProcess = listings.filter((l) => !processedSlugs.has(l.slug));
  console.log(`  To process: ${toProcess.length}\n`);

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

    process.stdout.write(`  Batch ${batchNum}/${totalBatches}: ${batch.map((l) => l.business_name).join(', ')}...`);

    const batchResults = await processBatch(batch, NICHE);
    enriched.push(...batchResults);

    // Save progress after each batch
    fs.writeFileSync(outputFile, JSON.stringify(enriched, null, 2));
    process.stdout.write(` ✅\n`);

    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  const successCount = enriched.filter((e) => !e.enrichment_error).length;
  const errorCount = enriched.filter((e) => e.enrichment_error).length;
  const luxuryCount = enriched.filter((e) => e.is_luxury).length;

  console.log(`\n✅ Enrichment complete!`);
  console.log(`   Total: ${enriched.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Luxury detected: ${luxuryCount}`);
  console.log(`   Saved to: ${outputFile}`);
  console.log(`\n⏭️  Next step: pnpm tsx scripts/pipeline/04_import_supabase.ts --niche ${NICHE}`);
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
