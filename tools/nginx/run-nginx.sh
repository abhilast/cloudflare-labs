#!/usr/bin/env bash
# Script to run nginx as a reverse proxy in a Docker container
# This proxies requests from port 80 to a backend server on port 8080

# Exit on any error, undefined variables, or pipe failures
set -euo pipefail

# Configuration variables
CONTAINER_NAME="nginx-proxy"
IMAGE="nginx:alpine"
NGINX_CONF="$PWD/nginx.conf"

# --- sanity checks ---
# Verify that nginx.conf exists in the current directory
if [[ ! -f "$NGINX_CONF" ]]; then
  echo "❌ nginx.conf not found in $PWD"
  exit 1
fi

# --- stop & remove existing container if it exists ---
# Check if a container with the same name is already running or stopped
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
# Flags explained:
# -d: Run container in detached mode (background)
# --name: Assign a name to the container for easy reference
# --restart unless-stopped: Automatically restart container unless manually stopped
# --network host: Use host network mode (container shares host's network stack)
# -v: Mount nginx.conf as read-only into the container's config location

echo "✅ nginx proxy is running"