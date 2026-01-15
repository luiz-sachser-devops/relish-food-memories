#!/bin/bash
# Stop the frontend, backend, and MongoDB service while freeing occupied ports.

set -euo pipefail

log() {
  printf '%s\n' "$1"
}

kill_port() {
  local port label
  port=$1
  label=$2
  local pids

  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | sed 's/ *$//' || true)
  if [[ -z "$pids" ]]; then
    log "    No $label process listening on port $port."
    return
  fi

  log "    Found $label listener on port $port (PID(s): $pids). Sending SIGTERM..."
  kill $pids 2>/dev/null || true
  sleep 1

  local survivors
  survivors=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | sed 's/ *$//' || true)
  if [[ -n "$survivors" ]]; then
    log "    Some $label processes survived; sending SIGKILL..."
    kill -KILL $survivors 2>/dev/null || true
  else
    log "    Port $port cleared."
  fi
}

log "==> Clearing the frontend (port 3000)..."
kill_port 3000 "frontend"

log "==> Clearing the backend (port 4000)..."
kill_port 4000 "backend"

if brew services list 2>/dev/null | grep -q "mongodb-community@7.0.*started"; then
  log "==> Stopping MongoDB service..."
  brew services stop mongodb-community@7.0 >/dev/null
  log "    MongoDB service stopped."
else
  log "==> MongoDB service is not running under brew."
fi

log "==> All clear."