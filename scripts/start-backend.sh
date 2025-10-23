#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BIND_ADDRESS="${BIND_ADDRESS:-127.0.0.1:3000}"
export BIND_ADDRESS

cd "$ROOT_DIR/backend"

echo "[backend] Starting knowflow-api on ${BIND_ADDRESS}"
exec cargo run -p knowflow-api
