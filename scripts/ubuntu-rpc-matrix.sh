#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

: "${RPC_LOG_DIR:=$HOME/Desktop/build-instant-flashloan-rpc}"
mkdir -p "$RPC_LOG_DIR"

run_probe() {
  local name="$1" envvar="$2" chain="$3"
  local url="${!envvar:-}"
  local safe="${name// /_}"
  if [[ -z "$url" ]]; then
    echo "SKIP $name: $envvar is unset"
    return 0
  fi
  echo "=== $name chain=$chain ==="
  RPC_URL="$url" EXPECTED_CHAIN_ID="$chain" node scripts/rpc-smoke.mjs 2>&1 | tee "$RPC_LOG_DIR/${safe}.txt"
}

run_probe Ethereum ETH_RPC_URL 1
run_probe "BNB Chain" BSC_RPC_URL 56
run_probe Base BASE_RPC_URL 8453
run_probe Arbitrum ARBITRUM_RPC_URL 42161
run_probe Avalanche AVAX_RPC_URL 43114
run_probe Cronos CRONOS_RPC_URL 25
run_probe Sonic SONIC_RPC_URL 146

echo "RPC_MATRIX_COMPLETE=true"
