#!/usr/bin/env bash
set -euo pipefail

# Read-only Alchemy RPC bootstrap for the seven-network verification matrix.
# This file is safe to source. It never prints the API key.
: "${ALCHEMY_API_KEY:?Set ALCHEMY_API_KEY to the real key before sourcing this file}"

case "${ALCHEMY_API_KEY}" in
  ""|YOUR_CURRENT_ALCHEMY_KEY|YOUR_REAL_ALCHEMY_KEY|PASTE_YOUR_ACTUAL_ALCHEMY_API_KEY_HERE)
    echo "ERROR: ALCHEMY_API_KEY is still a placeholder. Paste the real Alchemy API key." >&2
    return 1 2>/dev/null || exit 1
    ;;
esac

export ETH_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
export BSC_RPC_URL="https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
export BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
export ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
export AVAX_RPC_URL="https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
export CRONOS_RPC_URL="https://cronos-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
export SONIC_RPC_URL="https://sonic-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"

printf '%s\n' "Alchemy RPC environment prepared for 7 EVM networks (credentials not printed)."
