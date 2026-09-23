#!/usr/bin/env bash
set -euo pipefail

# Full seven-network local Anvil verification.
# Each network is forked from its configured real RPC, then every read-only
# RPC probe is executed against the local Anvil endpoint. No signing/broadcast.
BASE_PORT="${ANVIL_PORT_BASE:-18545}"
LOG_DIR="${ANVIL_VERIFY_LOG_DIR:-$HOME/Desktop/build-instant-flashloan-anvil}"
mkdir -p "$LOG_DIR"
PIDS=()

# Safe environment bootstrap: run this file directly; do not source it.
# If an Alchemy key is present, derive all seven RPC URLs here. Existing explicit
# RPC variables are preserved when no key is supplied.
if [[ -n "${ALCHEMY_API_KEY:-}" ]]; then
  source scripts/alchemy-rpc-env.sh
fi

require_rpc_env() {
  local envvar="$1"
  [[ -n "${!envvar:-}" ]] || { echo "FAIL $envvar is unset. Set ALCHEMY_API_KEY or export $envvar."; exit 1; }
  [[ "${!envvar}" != *'${!envvar:-}'* ]] || { echo "FAIL $envvar contains an unevaluated shell expression."; exit 1; }
}

NETWORKS=(
  "Ethereum|ETH_RPC_URL|1"
  "BNB Chain|BSC_RPC_URL|56"
  "Base|BASE_RPC_URL|8453"
  "Arbitrum One|ARBITRUM_RPC_URL|42161"
  "Avalanche C-Chain|AVAX_RPC_URL|43114"
  "Cronos|CRONOS_RPC_URL|25"
  "Sonic|SONIC_RPC_URL|146"
)

cleanup() {
  set +e
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "FAIL missing command: $1"; exit 1; }; }
need_cmd anvil
need_cmd cast
need_cmd forge
need_cmd node
need_cmd npm

echo "================================================"
echo "SEVEN-NETWORK FULL IMPLEMENTATION VERIFICATION"
echo "FORK_SOURCE=REAL_RPC"
echo "LOCAL_RPC=ANVIL"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "================================================"

i=0
for entry in "${NETWORKS[@]}"; do
  IFS='|' read -r name envvar expected <<<"$entry"
  port=$((BASE_PORT + i))
  rpc="http://127.0.0.1:$port"
  case "$envvar" in
    ETH_RPC_URL) upstream="${ETH_RPC_URL:-}" ;;
    BSC_RPC_URL) upstream="${BSC_RPC_URL:-}" ;;
    BASE_RPC_URL) upstream="${BASE_RPC_URL:-}" ;;
    ARBITRUM_RPC_URL) upstream="${ARBITRUM_RPC_URL:-}" ;;
    AVAX_RPC_URL) upstream="${AVAX_RPC_URL:-}" ;;
    CRONOS_RPC_URL) upstream="${CRONOS_RPC_URL:-}" ;;
    SONIC_RPC_URL) upstream="${SONIC_RPC_URL:-}" ;;
    *) echo "FAIL $name: unsupported RPC variable $envvar"; exit 1 ;;
  esac
  safe="${name// /_}"

  require_rpc_env "$envvar"
  [[ "$upstream" != *'\${'* && "$upstream" != *'YOUR_'* && "$upstream" != *'PASTE_YOUR_'* ]] || { echo "FAIL $name: placeholder/unevaluated RPC URL"; exit 1; }

  echo
  echo "[$name] Direct upstream RPC probe"
  RPC_URL="$upstream" EXPECTED_CHAIN_ID="$expected" node scripts/rpc-smoke.mjs | tee "$LOG_DIR/$safe-upstream-rpc.txt"

  echo "[$name] Anvil fork -> $rpc"
  anvil --fork-url "$upstream" --host 127.0.0.1 --port "$port" --silent >"$LOG_DIR/$safe-anvil.log" 2>&1 &
  pid=$!
  PIDS+=("$pid")

  ready=false
  for _ in {1..45}; do
    if cast chain-id --rpc-url "$rpc" >"$LOG_DIR/$safe-chain.txt" 2>"$LOG_DIR/$safe-chain.err"; then
      ready=true
      break
    fi
    sleep 1
  done
  [[ "$ready" == true ]] || { echo "FAIL $name: Anvil not ready"; cat "$LOG_DIR/$safe-anvil.log" || true; exit 1; }

  actual="$(tr -d '[:space:]' <"$LOG_DIR/$safe-chain.txt")"
  [[ "$actual" == "$expected" ]] || { echo "FAIL $name: expected chain=$expected actual=$actual"; exit 1; }

  block="$(cast block-number --rpc-url "$rpc" | tr -d '[:space:]')"
  gas="$(cast gas-price --rpc-url "$rpc" | tr -d '[:space:]')"
  balance="$(cast balance 0x0000000000000000000000000000000000000000 --rpc-url "$rpc" | tr -d '[:space:]')"
  code="$(cast code 0x0000000000000000000000000000000000000000 --rpc-url "$rpc")"
  call="$(cast call 0x0000000000000000000000000000000000000000 0x --rpc-url "$rpc")"
  estimate="$(cast estimate 0x0000000000000000000000000000000000000000 --rpc-url "$rpc" 2>/dev/null || true)"

  RPC_URL="$rpc" EXPECTED_CHAIN_ID="$expected"     node scripts/rpc-smoke.mjs | tee "$LOG_DIR/$safe-rpc-smoke.txt"

  node scripts/verify-locked-state.mjs | tee "$LOG_DIR/$safe-locked-state.txt"

  printf 'PASS %s chainId=%s block=%s gasPrice=%s zeroBalance=%s zeroCode=%s ethCall=%s estimateGas=%s rpc=%s\n'     "$name" "$actual" "$block" "$gas" "$balance" "${code:0:18}" "${call:0:18}" "${estimate:-not-returned}" "$rpc"

  i=$((i + 1))
done

echo
echo "================================================"
echo "SHARED IMPLEMENTATION TEST SUITE"
echo "================================================"
forge build
forge test
npm --prefix bot run build
npm --prefix bot test
npm --prefix dapp-dashboard run build
npm --prefix dapp-dashboard test

echo
echo "================================================"
echo "FULL MATRIX COMPLETE"
echo "NETWORKS_TESTED=7"
echo "ANVIL_PORTS=18545-18551"
echo "REAL_RPC_FORKS=true"
echo "READ_ONLY=true"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "================================================"
