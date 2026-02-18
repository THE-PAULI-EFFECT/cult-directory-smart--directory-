#!/bin/bash
# ──────────────────────────────────────────────────────────────────────
# NW Directory Empire — Full Data Pipeline Runner
#
# Usage:
#   bash scripts/pipeline/run_pipeline.sh porta_potty
#   bash scripts/pipeline/run_pipeline.sh senior_living --mock
#
# Steps:
#   1. Scrape from Outscraper (or mock)
#   2. Clean & normalize CSV
#   3. Enrich with Claude AI
#   4. Import to Supabase
# ──────────────────────────────────────────────────────────────────────

set -e

NICHE="${1:-porta_potty}"
STATE="${STATE:-wa}"
MOCK_FLAG="${2:-}"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   NW Directory Empire — Data Pipeline                   ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║   Niche: $NICHE"
echo "║   State: $STATE"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Load .env.local
if [ -f ".env.local" ]; then
  set -o allexport
  source .env.local
  set +o allexport
  echo "✅ Loaded .env.local"
else
  echo "⚠️  .env.local not found — using environment variables"
fi

# ── Step 1: Scrape ────────────────────────────────────────────────────

echo ""
echo "─────────────────────────────────────────────"
echo "STEP 1: Scraping from Outscraper"
echo "─────────────────────────────────────────────"
python3 scripts/pipeline/01_scrape_outscraper.py \
  --niche "$NICHE" \
  --state "$STATE" \
  $MOCK_FLAG

echo ""
echo "─────────────────────────────────────────────"
echo "STEP 2: Cleaning & Normalizing"
echo "─────────────────────────────────────────────"
python3 scripts/pipeline/02_clean_normalize.py \
  --niche "$NICHE" \
  --state "$STATE"

echo ""
echo "─────────────────────────────────────────────"
echo "STEP 3: Enriching with Claude AI"
echo "─────────────────────────────────────────────"
pnpm tsx scripts/pipeline/03_enrich_claude.ts --niche "$NICHE"

echo ""
echo "─────────────────────────────────────────────"
echo "STEP 4: Importing to Supabase"
echo "─────────────────────────────────────────────"
pnpm tsx scripts/pipeline/04_import_supabase.ts --niche "$NICHE"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ Pipeline Complete for: $NICHE"
echo "║"
echo "║   Next steps:"
echo "║   1. pnpm tsx scripts/test-lead-flow.ts"
echo "║   2. pnpm run dev — test pages locally"
echo "║   3. git push — deploy to Vercel"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
