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

## Strict live-read validation

For a fresh Ubuntu checkout, use one control terminal for build/state checks and one terminal per network when parallelism is desired. The strict seven-network read-only validator is:

    chmod +x scripts/alchemy-rpc-env.sh scripts/ubuntu-rpc-live-validate.sh
    read -rsp 'Alchemy API key: ' ALCHEMY_API_KEY; echo
    export ALCHEMY_API_KEY
    bash scripts/ubuntu-rpc-live-validate.sh
    unset ALCHEMY_API_KEY

The validator writes one transcript per network under `$HOME/Desktop/build-instant-flashloan-live-rpc/` and does not print the credential.

For parallel Anvil-backed validation, use seven network terminals plus one control terminal. Suggested ports are Ethereum `18545`, BNB `18546`, Base `18547`, Arbitrum `18548`, Avalanche `18549`, Cronos `18550`, and Sonic `18551`. Each Anvil process is local and does not broadcast upstream. Run the corresponding upstream-backed Anvil fork only after the direct RPC probe for that network succeeds.

Direct provider validation is the authoritative read-access check. Local Anvil validation alone is not evidence that the provider endpoint works.
