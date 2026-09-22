#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
: "${NETWORK_NAME:?Set NETWORK_NAME}"
: "${NETWORK_RPC_VAR:?Set NETWORK_RPC_VAR}"
: "${NETWORK_CHAIN_ID:?Set NETWORK_CHAIN_ID}"
: "${NETWORK_PORT:?Set NETWORK_PORT}"
: "${ALCHEMY_API_KEY:?Set ALCHEMY_API_KEY}"
source scripts/alchemy-rpc-env.sh
UPSTREAM="${!NETWORK_RPC_VAR:-}"
: "${UPSTREAM:?Resolved RPC variable is empty}"
LOG_DIR="${NETWORK_LOG_DIR:-$HOME/Desktop/build-instant-flashloan-anvil/$NETWORK_NAME}"
LOCAL_RPC="http://127.0.0.1:$NETWORK_PORT"
mkdir -p "$LOG_DIR"
PID=""
cleanup(){ set +e; [[ -n "$PID" ]] && kill "$PID" 2>/dev/null || true; [[ -n "$PID" ]] && wait "$PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
need_cmd(){ command -v "$1" >/dev/null 2>&1 || { echo "FAIL missing command: $1"; exit 1; }; }
need_cmd anvil; need_cmd cast; need_cmd node
echo "=== $NETWORK_NAME ==="
echo "UPSTREAM=$NETWORK_RPC_VAR"
echo "LOCAL_RPC=$LOCAL_RPC"
echo "CHAIN_ID=$NETWORK_CHAIN_ID"
echo "READ_ONLY=true SIGNING=false BROADCAST=false"
anvil --fork-url "$UPSTREAM" --host 127.0.0.1 --port "$NETWORK_PORT" --silent >"$LOG_DIR/anvil.log" 2>&1 &
PID=$!
ready=false
for _ in {1..60}; do
  if cast chain-id --rpc-url "$LOCAL_RPC" >"$LOG_DIR/chain-id.txt" 2>"$LOG_DIR/chain-id.err"; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { echo "FAIL Anvil did not start"; cat "$LOG_DIR/anvil.log" || true; exit 1; }
actual="$(tr -d '[:space:]' <"$LOG_DIR/chain-id.txt")"
[[ "$actual" == "$NETWORK_CHAIN_ID" ]] || { echo "FAIL chain mismatch expected=$NETWORK_CHAIN_ID actual=$actual"; exit 1; }
cast client --rpc-url "$LOCAL_RPC" | tee "$LOG_DIR/client.txt"
cast block-number --rpc-url "$LOCAL_RPC" | tee "$LOG_DIR/block-number.txt"
cast gas-price --rpc-url "$LOCAL_RPC" | tee "$LOG_DIR/gas-price.txt"
cast balance 0x0000000000000000000000000000000000000000 --rpc-url "$LOCAL_RPC" | tee "$LOG_DIR/zero-balance.txt"
cast code 0x0000000000000000000000000000000000000000 --rpc-url "$LOCAL_RPC" | tee "$LOG_DIR/zero-code.txt"
RPC_URL="$LOCAL_RPC" EXPECTED_CHAIN_ID="$NETWORK_CHAIN_ID" node scripts/rpc-smoke.mjs | tee "$LOG_DIR/rpc-smoke.txt"
node scripts/verify-locked-state.mjs | tee "$LOG_DIR/locked-state.txt"
echo "PASS $NETWORK_NAME"
echo "ANVIL_RPC=$LOCAL_RPC"
echo "LOG_DIR=$LOG_DIR"
