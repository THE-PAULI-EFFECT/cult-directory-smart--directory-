#!/bin/bash
# Download and install PocketBase
set -e

PB_VERSION="0.22.26"
PB_DIR="/opt/nw-empire/backend/pocketbase"

echo "📦 Installing PocketBase v${PB_VERSION}..."

cd "$PB_DIR"

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
  x86_64) PB_ARCH="amd64" ;;
  aarch64|arm64) PB_ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip"

echo "  Downloading from: $URL"
curl -fsSL "$URL" -o pocketbase.zip
unzip -o pocketbase.zip pocketbase
rm pocketbase.zip
chmod +x pocketbase

echo "✅ PocketBase installed at: $PB_DIR/pocketbase"
echo ""
echo "To start: $PB_DIR/pocketbase serve"
echo "Admin UI: http://localhost:8090/_/"
