#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="nginx-proxy"
IMAGE="nginx:alpine"
NGINX_CONF="$PWD/nginx.conf"

# --- sanity checks ---
if [[ ! -f "$NGINX_CONF" ]]; then
  echo "❌ nginx.conf not found in $PWD"
  exit 1
fi

# --- stop & remove existing container if it exists ---
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "🛑 Removing existing container: $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME"
fi

# --- run nginx ---
echo "🚀 Starting nginx proxy on port 80"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --network host \
  -v "$NGINX_CONF:/etc/nginx/nginx.conf:ro" \
  "$IMAGE"

echo "✅ nginx proxy is running"