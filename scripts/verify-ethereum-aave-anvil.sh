#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
: "${ETH_RPC_URL:?Set ETH_RPC_URL before running Ethereum Anvil/Aave verification}"
PORT="${ETH_AAVE_ANVIL_PORT:-18555}"
LOG_DIR="${ETH_AAVE_ANVIL_LOG_DIR:-$HOME/Desktop/build-instant-flashloan-ethereum-anvil}"
LOCAL_RPC="http://127.0.0.1:${PORT}"
mkdir -p "$LOG_DIR"
PID=""
cleanup() {
  set +e
  if [[ -n "$PID" ]]; then kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "FAIL missing command: $1"; exit 1; }; }
need_cmd anvil; need_cmd cast; need_cmd forge; need_cmd node

echo "================================================"
echo "ETHEREUM AAVE V3 — REAL RPC -> ANVIL -> FORK TEST"
echo "================================================"
echo "UPSTREAM_RPC=ETH_RPC_URL"
echo "LOCAL_RPC=$LOCAL_RPC"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "================================================"

anvil --fork-url "$ETH_RPC_URL" --host 127.0.0.1 --port "$PORT" --silent >"$LOG_DIR/anvil.log" 2>&1 &
PID=$!

ready=false
for _ in {1..45}; do
  if cast chain-id --rpc-url "$LOCAL_RPC" >"$LOG_DIR/chain-id.txt" 2>"$LOG_DIR/chain-id.err"; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { cat "$LOG_DIR/anvil.log" || true; exit 1; }
[[ "$(tr -d "[:space:]" < "$LOG_DIR/chain-id.txt")" == "1" ]] || { echo "FAIL local fork chain id"; exit 1; }

cast block-number --rpc-url "$LOCAL_RPC" | tee "$LOG_DIR/block-number.txt"
RPC_URL="$LOCAL_RPC" EXPECTED_CHAIN_ID=1 node scripts/rpc-smoke.mjs | tee "$LOG_DIR/rpc-smoke.txt"
node scripts/verify-locked-state.mjs | tee "$LOG_DIR/locked-state.txt"

echo "--- Aave callback against the local Anvil fork ---"
(
  cd contracts
  ETH_RPC_URL="$LOCAL_RPC" forge test --match-contract AaveFlashLoanCallbackForkTest --match-test testEthereumForkAaveFlashLoanCallback -vv
) 2>&1 | tee "$LOG_DIR/aave-callback.txt"

echo "--- Two-leg executor against the local Anvil fork ---"
(
  cd contracts
  ETH_RPC_URL="$LOCAL_RPC" forge test --match-contract AaveFlashArbExecutorForkTest --match-test testEthereumForkTwoLegAtomicExecutor -vv
) 2>&1 | tee "$LOG_DIR/two-leg-executor.txt"

echo "================================================"
echo "ETHEREUM_AAVE_ANVIL_VERIFICATION=true"
echo "FORK_SOURCE=REAL_ETHEREUM_RPC"
echo "LOCAL_ANVIL=true"
echo "AAVE_CALLBACK_TEST=true"
echo "TWO_LEG_EXECUTOR_TEST=true"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "LOG_DIR=$LOG_DIR"
echo "================================================"
