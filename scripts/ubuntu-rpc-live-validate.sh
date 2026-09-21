#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

RPC_LOG_DIR="${RPC_LOG_DIR:-$HOME/Desktop/build-instant-flashloan-live-rpc}"
mkdir -p "$RPC_LOG_DIR"

source scripts/alchemy-rpc-env.sh

run_probe() {
  local name="$1" envvar="$2" chain="$3"
  local url="${!envvar:-}"
  local safe="${name// /_}"

  [[ -n "$url" ]] || {
    echo "FAIL $name: $envvar is unset"
    return 1
  }

  echo "=== $name chain=$chain ==="
  RPC_URL="$url" EXPECTED_CHAIN_ID="$chain"     node scripts/rpc-smoke.mjs 2>&1 | tee "$RPC_LOG_DIR/${safe}.txt"
}

failures=0
run_probe Ethereum ETH_RPC_URL 1 || failures=$((failures + 1))
run_probe "BNB Chain" BSC_RPC_URL 56 || failures=$((failures + 1))
run_probe Base BASE_RPC_URL 8453 || failures=$((failures + 1))
run_probe Arbitrum ARBITRUM_RPC_URL 42161 || failures=$((failures + 1))
run_probe Avalanche AVAX_RPC_URL 43114 || failures=$((failures + 1))
run_probe Cronos CRONOS_RPC_URL 25 || failures=$((failures + 1))
run_probe Sonic SONIC_RPC_URL 146 || failures=$((failures + 1))

if (( failures > 0 )); then
  echo "LIVE_READ_ONLY_RPC_MATRIX=false"
  echo "RPC_FAILURES=$failures"
  echo "SIGNING=false"
  echo "BROADCAST=false"
  exit 1
fi

echo "LIVE_READ_ONLY_RPC_MATRIX=true"
echo "SIGNING=false"
echo "BROADCAST=false"
