#!/usr/bin/env bash
set -euo pipefail
PORT="${ANVIL_PORT:-18545}"
RPC_URL="http://127.0.0.1:${PORT}"
LOG_FILE="${ANVIL_LOG_FILE:-/tmp/build-instant-flashloan-anvil-${PORT}.log}"
command -v anvil >/dev/null || { echo "ERROR: anvil not found" >&2; exit 1; }
command -v node >/dev/null || { echo "ERROR: node not found" >&2; exit 1; }
cleanup() { if [[ -n "${ANVIL_PID:-}" ]] && kill -0 "$ANVIL_PID" 2>/dev/null; then kill "$ANVIL_PID" 2>/dev/null || true; wait "$ANVIL_PID" 2>/dev/null || true; fi; }
trap cleanup EXIT INT TERM
args=(--host 127.0.0.1 --port "$PORT")
if [[ -n "${ANVIL_FORK_URL:-}" ]]; then args+=(--fork-url "$ANVIL_FORK_URL"); EXPECTED_CHAIN_ID="${EXPECTED_CHAIN_ID:-1}"; else EXPECTED_CHAIN_ID="${EXPECTED_CHAIN_ID:-31337}"; fi
echo "Starting Anvil on 127.0.0.1:$PORT"
echo "Log: $LOG_FILE"
anvil "${args[@]}" >"$LOG_FILE" 2>&1 &
ANVIL_PID=$!
for _ in {1..30}; do if curl -fsS "$RPC_URL" >/dev/null 2>&1; then break; fi; sleep 1; done
curl -fsS "$RPC_URL" >/dev/null 2>&1 || { tail -n 40 "$LOG_FILE" >&2 || true; exit 1; }
RPC_URL="$RPC_URL" EXPECTED_CHAIN_ID="$EXPECTED_CHAIN_ID" node scripts/rpc-smoke.mjs
