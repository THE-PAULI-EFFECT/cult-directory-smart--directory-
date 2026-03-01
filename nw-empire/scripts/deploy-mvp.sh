#!/bin/bash
# ═══════════════════════════════════════════════════════════
# NW EMPIRE — ONE-SHOT DEPLOY SCRIPT
# Run as root on Ubuntu/Debian VPS
# Usage: bash deploy-mvp.sh [domain]
# ═══════════════════════════════════════════════════════════
set -e

DOMAIN="${1:-wa-portapotty.com}"
EMPIRE_ROOT="/opt/nw-empire"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   🚀 NW DIRECTORY EMPIRE — ONE-SHOT DEPLOY          ║"
echo "║   Domain: $DOMAIN                     "
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. System Dependencies ─────────────────────────────────
echo "▶ Step 1/6: Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl wget unzip nginx nodejs npm

# Install PM2 globally
npm install -g pm2 2>/dev/null || true

echo "  ✅ System deps installed (Node $(node -v))"

# ── 2. PocketBase ─────────────────────────────────────────
echo ""
echo "▶ Step 2/6: Installing PocketBase..."
bash "${EMPIRE_ROOT}/scripts/setup-pocketbase.sh"
echo "  ✅ PocketBase installed"

# ── 3. Frontend Build ─────────────────────────────────────
echo ""
echo "▶ Step 3/6: Building Next.js frontend..."
cd "${EMPIRE_ROOT}/frontend"
npm install --silent
NEXT_PUBLIC_POCKETBASE_URL="http://localhost:8090" npm run build
echo "  ✅ Frontend built"

# ── 4. CLI Setup ──────────────────────────────────────────
echo ""
echo "▶ Step 4/6: Installing CLI..."
cd "${EMPIRE_ROOT}/cli"
npm install --silent
chmod +x "${EMPIRE_ROOT}/cli/bin/nw-empire.js"
ln -sf "${EMPIRE_ROOT}/cli/bin/nw-empire.js" /usr/local/bin/nw-empire
echo "  ✅ CLI installed (nw-empire --help)"

# ── 5. Services ───────────────────────────────────────────
echo ""
echo "▶ Step 5/6: Starting services..."

# PocketBase
cd "${EMPIRE_ROOT}/backend/pocketbase"
./pocketbase serve --http="0.0.0.0:8090" &
PB_PID=$!
sleep 3

if kill -0 $PB_PID 2>/dev/null; then
  echo "  ✅ PocketBase running (pid $PB_PID)"
else
  echo "  ⚠️  PocketBase may have exited — check logs"
fi

# Next.js
pm2 start "${EMPIRE_ROOT}/frontend/.next/standalone/server.js" \
  --name nw-portapotty \
  --env production \
  -- --port 3000 2>/dev/null \
  || pm2 start npm --name nw-portapotty -f -- start --prefix "${EMPIRE_ROOT}/frontend"

pm2 save
pm2 startup 2>/dev/null || true
echo "  ✅ Next.js running via PM2"

# ── 6. Nginx ──────────────────────────────────────────────
echo ""
echo "▶ Step 6/6: Configuring Nginx..."
bash "${EMPIRE_ROOT}/scripts/setup-nginx.sh" "$DOMAIN"
echo "  ✅ Nginx configured"

# ── Done! ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ DEPLOYMENT COMPLETE!"
echo "║"
echo "║   🌐 Site:       http://$DOMAIN"
echo "║   🗄️  PocketBase: http://$DOMAIN/_pb/"
echo "║"
echo "║   NEXT STEPS:"
echo "║   1. Visit http://$DOMAIN:8090/_/ → create admin"
echo "║   2. nw-empire setup-db"
echo "║   3. nw-empire seed --count 20"
echo "║   4. nw-empire status"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
