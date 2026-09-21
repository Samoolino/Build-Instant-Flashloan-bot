#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

RPC_LOG_DIR="${RPC_LOG_DIR:-$HOME/Desktop/build-instant-flashloan-live-rpc}"
mkdir -p "$RPC_LOG_DIR"

source scripts/alchemy-rpc-env.sh

run_probe() {
  local name="$1" envvar="$2" chain="$3"
  local url
  case "$envvar" in
    ETH_RPC_URL) url="${ETH_RPC_URL:-}" ;;
    BSC_RPC_URL) url="${BSC_RPC_URL:-}" ;;
    BASE_RPC_URL) url="${BASE_RPC_URL:-}" ;;
    ARBITRUM_RPC_URL) url="${ARBITRUM_RPC_URL:-}" ;;
    AVAX_RPC_URL) url="${AVAX_RPC_URL:-}" ;;
    CRONOS_RPC_URL) url="${CRONOS_RPC_URL:-}" ;;
    SONIC_RPC_URL) url="${SONIC_RPC_URL:-}" ;;
    *) echo "FAIL $name: unsupported RPC variable $envvar"; return 1 ;;
  esac

  [[ -n "$url" ]] || {
    echo "FAIL $name: $envvar is unset"
    return 1
  }

  echo "=== $name chain=$chain ==="
  RPC_URL="$url" EXPECTED_CHAIN_ID="$chain" node scripts/rpc-smoke.mjs 2>&1 | tee "$RPC_LOG_DIR/${name// /_}.txt"
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
