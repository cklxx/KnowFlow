#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Default to the loopback address explicitly so tools like Expo Web resolve the
# backend consistently across macOS/Linux without depending on host name
# resolution quirks.
EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://127.0.0.1:3000}"
export EXPO_PUBLIC_API_BASE_URL

WEB_PORT="${WEB_PORT:-8081}"

cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  echo "[frontend] Installing dependencies..."
  npm install
fi

echo "[frontend] Starting Expo web dev server on port ${WEB_PORT} (API base: ${EXPO_PUBLIC_API_BASE_URL})"
exec npx expo start --web --port "$WEB_PORT"
