#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Default to the loopback address explicitly for consistent backend resolution
# across macOS/Linux without depending on host name resolution quirks.
VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://127.0.0.1:3000}"
export VITE_API_BASE_URL

cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  echo "[frontend] Installing dependencies..."
  npm install
fi

echo "[frontend] Starting Vite development server (API base: ${VITE_API_BASE_URL})"
exec npm run dev
