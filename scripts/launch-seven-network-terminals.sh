#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
: "${ALCHEMY_API_KEY:?Set ALCHEMY_API_KEY before launching terminals}"
source scripts/alchemy-rpc-env.sh
command -v gnome-terminal >/dev/null 2>&1 || { echo "FAIL gnome-terminal is required"; exit 1; }
declare -a NAMES=(Ethereum "BNB Chain" Base "Arbitrum One" "Avalanche C-Chain" Cronos Sonic)
declare -a VARS=(ETH_RPC_URL BSC_RPC_URL BASE_RPC_URL ARBITRUM_RPC_URL AVAX_RPC_URL CRONOS_RPC_URL SONIC_RPC_URL)
declare -a IDS=(1 56 8453 42161 43114 25 146)
declare -a PORTS=(18545 18546 18547 18548 18549 18550 18551)
for i in "${!NAMES[@]}"; do
  cmd="cd '$PWD'; export NETWORK_NAME='${NAMES[$i]}'; export NETWORK_RPC_VAR='${VARS[$i]}'; export NETWORK_CHAIN_ID='${IDS[$i]}'; export NETWORK_PORT='${PORTS[$i]}'; bash scripts/verify-network-anvil.sh; printf '\\nVerification finished. Press Enter to close this verification terminal.\\n'; read"
  gnome-terminal --title="Flashloan RPC — ${NAMES[$i]}" -- bash -lc "$cmd"
done
echo "Seven verification terminals launched."
