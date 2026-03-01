#!/bin/bash
# Create systemd services for PocketBase and Next.js
set -e

EMPIRE_ROOT="/opt/nw-empire"

echo "🔧 Setting up systemd services..."

# ── PocketBase Service ─────────────────────────────────────────────────────────
cat > /etc/systemd/system/nw-pocketbase.service << EOF
[Unit]
Description=NW Empire PocketBase
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${EMPIRE_ROOT}/backend/pocketbase
ExecStart=${EMPIRE_ROOT}/backend/pocketbase/pocketbase serve --http="0.0.0.0:8090"
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ── Next.js Service ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/nw-frontend.service << EOF
[Unit]
Description=NW Empire Next.js Frontend
After=network.target nw-pocketbase.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${EMPIRE_ROOT}/frontend
ExecStart=/usr/bin/node .next/standalone/server.js
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nw-pocketbase nw-frontend
echo "✅ Services created: nw-pocketbase, nw-frontend"
echo ""
echo "Start with:"
echo "  systemctl start nw-pocketbase"
echo "  systemctl start nw-frontend"
