#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_CMD=("$SCRIPT_DIR/start-backend.sh")
FRONTEND_CMD=("$SCRIPT_DIR/start-frontend.sh")

BACKEND_PID=""
FRONTEND_PID=""

stop_services() {
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "[dev] Stopping frontend (pid $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[dev] Stopping backend (pid $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

on_signal() {
  echo "[dev] Caught termination signal"
  stop_services
  exit 0
}

trap on_signal INT TERM

(
  cd "$ROOT_DIR"
  "${BACKEND_CMD[@]}"
) &
BACKEND_PID=$!

echo "[dev] Backend PID: $BACKEND_PID"

(
  cd "$ROOT_DIR"
  "${FRONTEND_CMD[@]}"
) &
FRONTEND_PID=$!

echo "[dev] Frontend PID: $FRONTEND_PID"

# Monitor child processes manually for better portability (macOS bash does not support
# `wait -n`). Loop until either process exits and capture its exit code.
set +e
EXIT_CODE=0
while true; do
  if [[ -n "$BACKEND_PID" ]] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    wait "$BACKEND_PID" 2>/dev/null
    EXIT_CODE=$?
    break
  fi

  if [[ -n "$FRONTEND_PID" ]] && ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    wait "$FRONTEND_PID" 2>/dev/null
    EXIT_CODE=$?
    break
  fi

  sleep 1
done
set -e

stop_services

exit "$EXIT_CODE"
