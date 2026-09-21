#!/usr/bin/env bash
set -euo pipefail

# Seven-network Anvil fork verification.
# Starts one local Anvil fork per configured real RPC, verifies the inherited
# chain identity/block, then runs the repository's deterministic test suites.
# Never signs or broadcasts a transaction.

BASE_PORT="${ANVIL_PORT_BASE:-18545}"
WORKDIR="${WORKDIR:-$(pwd)}"
PIDS=()

NETWORKS=(
  "Ethereum|ETH_RPC_URL|1|Ethereum"
  "BNB Chain|BSC_RPC_URL|56|BNB"
  "Base|BASE_RPC_URL|8453|Base"
  "Arbitrum One|ARBITRUM_RPC_URL|42161|Arbitrum"
  "Avalanche C-Chain|AVAX_RPC_URL|43114|Avalanche"
  "Cronos|CRONOS_RPC_URL|25|Cronos"
  "Sonic|SONIC_RPC_URL|146|Sonic"
)

cleanup() {
  set +e
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "FAIL missing command: $1"; exit 1; }; }
need_cmd anvil
need_cmd cast
need_cmd forge
need_cmd npm

echo "================================================"
echo "SEVEN-NETWORK ANVIL FORK VERIFICATION"
echo "READ_ONLY=true"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "================================================"

i=0
for entry in "${NETWORKS[@]}"; do
  IFS='|' read -r name envvar expected label <<<"$entry"
  port=$((BASE_PORT + i))
  url="${!envvar:-}"

  if [[ -z "$url" ]]; then
    echo "FAIL $name: $envvar is unset"
    exit 1
  fi

  echo
  echo "[$name] starting Anvil fork on 127.0.0.1:$port"
  anvil --fork-url "$url" --port "$port" --silent >/tmp/flashloan-anvil-$port.log 2>&1 &
  pid=$!
  PIDS+=("$pid")

  ready=false
  for _ in {1..30}; do
    if cast chain-id --rpc-url "http://127.0.0.1:$port" >/tmp/flashloan-chain-$port.out 2>/tmp/flashloan-chain-$port.err; then
      ready=true
      break
    fi
    sleep 1
  done

  if [[ "$ready" != true ]]; then
    echo "FAIL $name: Anvil did not become ready"
    cat "/tmp/flashloan-anvil-$port.log" || true
    exit 1
  fi

  actual="$(cat /tmp/flashloan-chain-$port.out | tr -d '[:space:]')"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL $name: expected chainId=$expected actual=$actual"
    exit 1
  fi

  block="$(cast block-number --rpc-url "http://127.0.0.1:$port" | tr -d '[:space:]')"
  if ! [[ "$block" =~ ^[0-9]+$ ]]; then
    echo "FAIL $name: invalid block number: $block"
    exit 1
  fi

  echo "PASS $name chainId=$actual block=$block anvil_rpc=http://127.0.0.1:$port"
  i=$((i + 1))
done

echo
echo "================================================"
echo "REPOSITORY DETERMINISTIC VERIFICATION"
echo "================================================"
node scripts/verify-locked-state.mjs
forge build
forge test
npm --prefix bot run build
npm --prefix bot test
npm --prefix dapp-dashboard run build
npm --prefix dapp-dashboard test

echo
echo "================================================"
echo "ANVIL MATRIX COMPLETE"
echo "NETWORKS_TESTED=7"
echo "ANVIL_PORTS=18545-18551"
echo "READ_ONLY=true"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "================================================"
