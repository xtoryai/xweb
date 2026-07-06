#!/bin/bash
# Quick deploy — rebuilds only changed layers, keeps content data
set -e
cd "$(dirname "$0")"

echo "==> Rebuilding (cached layers)..."
docker build -t uuwish .

echo "==> Restarting container..."
docker rm -f uuwish 2>/dev/null || true
docker run -d \
  --name uuwish \
  -p 4321:4321 \
  -v /data/uuwish/content:/app/src/content \
  -v /data/uuwish/uploads:/app/public/uploads \
  --restart always \
  uuwish

echo "==> Done"
