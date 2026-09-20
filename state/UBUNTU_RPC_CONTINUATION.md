# Ubuntu RPC Continuation

From a fresh Ubuntu terminal:

    cd ~/Build-Instant-Flashloan-bot
    node --version
    forge --version
    anvil --version
    npm --version

Store complete provider URLs only in the shell environment; never commit provider credentials.

Use complete provider endpoints in this form:

    export ETH_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"

Use the provider's current documented hostname for each network; do not assume every network accepts the same hostname pattern.

Direct read-only Ethereum probe:

    RPC_URL="$ETH_RPC_URL" EXPECTED_CHAIN_ID=1 node scripts/rpc-smoke.mjs

All configured networks with Desktop transcripts:

    bash scripts/ubuntu-rpc-matrix.sh

Local Anvil smoke:

    bash scripts/anvil-rpc-smoke.sh

Anvil fork backed by Ethereum upstream RPC:

    ANVIL_FORK_URL="$ETH_RPC_URL" EXPECTED_CHAIN_ID=1 bash scripts/anvil-rpc-smoke.sh

The Anvil fork path verifies that Anvil can obtain fork state from the supplied upstream endpoint. It does not broadcast to mainnet.

For CI, add complete RPC URLs as GitHub Actions secrets named ETH_RPC_URL, BSC_RPC_URL, BASE_RPC_URL, ARBITRUM_RPC_URL, AVAX_RPC_URL, CRONOS_RPC_URL and SONIC_RPC_URL, then manually dispatch the RPC Smoke Verification workflow.
