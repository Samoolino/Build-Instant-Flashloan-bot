#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
: "${ALCHEMY_API_KEY:?Set ALCHEMY_API_KEY before running this script}"
source scripts/alchemy-rpc-env.sh
echo "RPC terminal environment prepared."
echo "Credentials are not printed."
for v in ETH_RPC_URL BSC_RPC_URL BASE_RPC_URL ARBITRUM_RPC_URL AVAX_RPC_URL CRONOS_RPC_URL SONIC_RPC_URL; do
  [[ -n "${!v:-}" ]] && echo "SET  $v" || echo "MISS $v"
done
