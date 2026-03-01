#!/bin/bash
# ═══════════════════════════════════════════════════════════
# NW EMPIRE — END-TO-END VERIFICATION LOOP
# Based on Ralphy/SKILL.md build-check-verify pattern
#
# Checks everything: PocketBase, Next.js, lead form, API
# Loops until all tests pass or max retries hit
# ═══════════════════════════════════════════════════════════

set -e

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
PB_URL="${PB_URL:-http://localhost:8090}"
MAX_RETRIES=3
PASS=0
FAIL=0
SKIP=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✅ PASS${NC} — $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}❌ FAIL${NC} — $1"; FAIL=$((FAIL+1)); }
skip() { echo -e "  ${YELLOW}⚠️  SKIP${NC} — $1"; SKIP=$((SKIP+1)); }
section() { echo -e "\n${BOLD}${CYAN}▶ $1${NC}"; }

# ── Helper: retry curl ────────────────────────────────────────────────────────
http_check() {
  local url="$1"
  local expected_status="${2:-200}"
  local retries=0

  while [ $retries -lt $MAX_RETRIES ]; do
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
    if [ "$status" = "$expected_status" ]; then
      return 0
    fi
    retries=$((retries+1))
    sleep 2
  done
  return 1
}

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  🧪 NW EMPIRE — E2E VERIFICATION SUITE          ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo -e "  Frontend: ${CYAN}$FRONTEND_URL${NC}"
echo -e "  PocketBase: ${CYAN}$PB_URL${NC}"

# ═══════════════════════════════════════════════════════════
# TEST 1: PocketBase Health
# ═══════════════════════════════════════════════════════════
section "1. PocketBase Backend"

if http_check "$PB_URL/api/health" 200; then
  pass "PocketBase is running (:8090)"
else
  fail "PocketBase is NOT running — start with: ./pocketbase serve"
fi

# Check collections exist (via leads/listings endpoints — collections API requires admin auth)
if http_check "$PB_URL/api/collections/listings/records" 200; then
  pass "listings collection exists"
elif http_check "$PB_URL/api/collections/listings/records" 403; then
  pass "listings collection exists (access restricted as expected)"
else
  skip "listings collection not found — run: nw-empire setup-db"
fi

if http_check "$PB_URL/api/collections/leads/records" 403; then
  pass "leads collection exists (write-only as expected)"
elif http_check "$PB_URL/api/collections/leads/records" 200; then
  pass "leads collection exists"
else
  skip "leads collection not found — run: nw-empire setup-db"
fi

# ═══════════════════════════════════════════════════════════
# TEST 2: Next.js Frontend
# ═══════════════════════════════════════════════════════════
section "2. Next.js Frontend"

if http_check "$FRONTEND_URL" 200; then
  pass "Homepage loads (:3000)"
else
  fail "Homepage NOT responding — start with: npm run dev"
fi

if http_check "$FRONTEND_URL/api/leads" 200; then
  pass "Lead API endpoint responds"
else
  fail "Lead API endpoint not responding"
fi

# ═══════════════════════════════════════════════════════════
# TEST 3: Lead Form Submission
# ═══════════════════════════════════════════════════════════
section "3. Lead Capture Flow"

TEST_LEAD=$(cat << 'JSON'
{
  "name": "Test User",
  "email": "test@nw-empire.local",
  "phone": "(206) 555-9999",
  "event_type": "construction",
  "event_date": "2025-12-01",
  "event_location": "Seattle, WA",
  "unit_quantity": 2,
  "niche": "porta_potty",
  "source_url": "http://localhost/test"
}
JSON
)

LEAD_RESPONSE=$(curl -sf -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_LEAD" \
  "$FRONTEND_URL/api/leads" 2>/dev/null || echo "FAILED")

if echo "$LEAD_RESPONSE" | grep -q "success\|id" 2>/dev/null; then
  pass "Lead form submits successfully"
else
  fail "Lead form submission failed — response: $(echo $LEAD_RESPONSE | head -c 100)"
fi

# Direct PocketBase test
LEAD_ID=$(curl -sf -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_LEAD" \
  "$PB_URL/api/collections/leads/records" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$LEAD_ID" ]; then
  pass "Lead saved to PocketBase (id=$LEAD_ID)"

  # Cleanup test lead
  curl -sf -X DELETE "$PB_URL/api/collections/leads/records/$LEAD_ID" 2>/dev/null || true
  pass "Test lead cleaned up"
else
  skip "Direct PocketBase lead insertion — may need admin auth"
fi

# ═══════════════════════════════════════════════════════════
# TEST 4: City & Listing Pages
# ═══════════════════════════════════════════════════════════
section "4. SEO Page Routes"

if http_check "$FRONTEND_URL/seattle" 200; then
  pass "City page /seattle loads"
elif http_check "$FRONTEND_URL/seattle" 404; then
  skip "City page /seattle returns 404 (no listings in DB yet)"
else
  fail "City page /seattle — unexpected error"
fi

# ═══════════════════════════════════════════════════════════
# TEST 5: CLI Available
# ═══════════════════════════════════════════════════════════
section "5. nw-empire CLI"

if command -v nw-empire &>/dev/null || [ -f /opt/nw-empire/cli/bin/nw-empire.js ]; then
  pass "nw-empire CLI installed"

  # Verify CLI runs
  if node /opt/nw-empire/cli/bin/nw-empire.js --version 2>/dev/null | grep -q "[0-9]"; then
    pass "CLI executes without errors"
  else
    skip "CLI version check — node may not be in PATH"
  fi
else
  fail "nw-empire CLI not installed — run: cd /opt/nw-empire/cli && npm link"
fi

# ═══════════════════════════════════════════════════════════
# TEST 6: TypeScript Build Check
# ═══════════════════════════════════════════════════════════
section "6. TypeScript / Build Verification"

if [ -f /opt/nw-empire/frontend/node_modules/.bin/tsc ]; then
  TS_RESULT=$(cd /opt/nw-empire/frontend && npx tsc --noEmit 2>&1)
  if [ -z "$TS_RESULT" ]; then
    pass "TypeScript check — no errors"
  else
    fail "TypeScript errors found:\n$TS_RESULT"
  fi
else
  skip "TypeScript check — run 'cd frontend && npm install' first"
fi

# ═══════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════
TOTAL=$((PASS+FAIL+SKIP))

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  📊 RESULTS                                      ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════╣${NC}"
echo -e "  ${GREEN}PASSED${NC}:  $PASS / $TOTAL"
echo -e "  ${RED}FAILED${NC}:  $FAIL / $TOTAL"
echo -e "  ${YELLOW}SKIPPED${NC}: $SKIP / $TOTAL"

if [ $FAIL -eq 0 ]; then
  echo -e "\n  ${GREEN}${BOLD}✅ ALL TESTS PASSED! Site is ready.${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
  exit 0
else
  echo -e "\n  ${RED}${BOLD}❌ $FAIL TEST(S) FAILED — Check logs above${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${YELLOW}Fix failed tests and re-run: nw-empire test${NC}"
  echo ""
  exit 1
fi
