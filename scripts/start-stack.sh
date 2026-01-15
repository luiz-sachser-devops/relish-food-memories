#!/bin/bash
# Start MongoDB, the backend API, and the frontend UI in sequence with playful status messages.

set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd "$script_dir/.." && pwd)

cd "$repo_root"

log() {
  printf '%s\n' "$1"
}

log "==> [1/3] Warming up the MongoDB pantry..."
if brew services list 2>/dev/null | grep -q "mongodb-community@7.0.*started"; then
  log "    MongoDB is already simmering."
else
  brew services start mongodb-community@7.0 >/dev/null
  log "    MongoDB is now simmering."
fi

log "==> [2/3] Firing up the API stovetop..."
npm --prefix server run dev &
BACKEND_PID=$!

log "    Waiting for the kitchen pass at http://localhost:4000/health ..."
for attempt in {1..30}; do
  if curl -sf http://localhost:4000/health >/dev/null; then
    log "    API is plating on port 4000."
    break
  fi
  sleep 1
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    log "    Backend exited unexpectedly."
    wait "$BACKEND_PID"
    exit 1
  fi
  if [[ $attempt -eq 30 ]]; then
    log "    API did not come online in time."
    exit 1
  fi
done

log "==> [3/3] Tossing the frontend salad..."
npm start &
FRONTEND_PID=$!

log "    Frontend launching on http://localhost:3000"
log "    Press Ctrl+C to clear the kitchen."

cleanup() {
  log "\n==> Tidying up the kitchen..."
  kill "$FRONTEND_PID" "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  log "    Processes stopped."
}

trap cleanup INT TERM

wait