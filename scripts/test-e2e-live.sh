#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

API_BASE="${VITE_API_BASE_URL:-http://127.0.0.1:3000}"

cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  echo "[e2e-live] Installing frontend dependencies..."
  npm install
fi

echo "[e2e-live] Running E2E tests against live API at $API_BASE"
echo "[e2e-live] Note: E2E testing framework may need updates for React web architecture"
E2E_USE_LIVE_API=1 VITE_API_BASE_URL="$API_BASE" npx jest --config jest.e2e.config.js "$@"
