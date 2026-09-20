# Source this file; it exports read-only RPC endpoints from ALCHEMY_API_KEY.
# It never prints the credential.
set -euo pipefail

: "\${ALCHEMY_API_KEY:?Set ALCHEMY_API_KEY in the shell before sourcing this file}"

export ETH_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/\${ALCHEMY_API_KEY}"
export BSC_RPC_URL="https://bnb-mainnet.g.alchemy.com/v2/\${ALCHEMY_API_KEY}"
export BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/\${ALCHEMY_API_KEY}"
export ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/\${ALCHEMY_API_KEY}"
export AVAX_RPC_URL="https://avax-mainnet.g.alchemy.com/v2/\${ALCHEMY_API_KEY}"
export CRONOS_RPC_URL="https://cronos-mainnet.g.alchemy.com/v2/\${ALCHEMY_API_KEY}"
export SONIC_RPC_URL="https://sonic-mainnet.g.alchemy.com/v2/\${ALCHEMY_API_KEY}"

printf '%s\n' "Alchemy RPC environment prepared for 7 EVM networks (credentials not printed)."
