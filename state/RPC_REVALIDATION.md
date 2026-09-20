# RPC Revalidation

Normal CI verifies locked state, Forge build/tests, bot build, and dashboard build. It does not inject a live RPC endpoint.

The repository has a separate manually dispatched Ethereum fork workflow. It requires the GitHub Actions secret ETH_RPC_URL and runs the two fork tests only when that secret is present.

Most bot-side RPC tests use in-memory RpcTransport mocks. Those prove request construction, parsing, validation and control flow; they are not evidence of a network request.

The Ethereum fork tests are different: when ETH_RPC_URL is supplied, Foundry calls vm.createSelectFork(rpc) and reads live Ethereum state. The two-leg fork test deliberately uses a deterministic/mock swap venue, so it is a hybrid test: real Aave fork state plus mocked swap venue.

Therefore:
- normal CI green != live RPC verified
- mocked RPC tests != live RPC calls
- fork workflow green with ETH_RPC_URL configured = actual Ethereum fork verification
- Anvil fork = local in-memory execution backed by an upstream RPC; it is not a mainnet broadcast

## Read-only RPC smoke coverage

The smoke test covers:
eth_chainId, net_version, eth_blockNumber, eth_getBlockByNumber, eth_gasPrice, eth_getBalance, eth_getCode, eth_call, optional eth_estimateGas, optional eth_getTransactionByHash, and optional eth_getTransactionReceipt.

No private key, signing method, or broadcast method is used.

## Alchemy key clarification

The supplied alch_... value is an API credential/key, not a complete JSON-RPC URL. It cannot by itself be compared to ETH_RPC_URL/BSC_RPC_URL/etc. A complete endpoint has the form:

https://<network>.g.alchemy.com/v2/<API_KEY>

Alchemy documents RPC endpoints for Ethereum, BNB, Base, Arbitrum, Avalanche, Cronos and Sonic. The repository should receive complete URLs through environment variables and should never commit the key.

## Ubuntu commands

Live endpoint:

    RPC_URL="$ETH_RPC_URL" EXPECTED_CHAIN_ID=1 node scripts/rpc-smoke.mjs

Local Anvil:

    ./scripts/anvil-rpc-smoke.sh

Anvil fork:

    ANVIL_FORK_URL="$ETH_RPC_URL" EXPECTED_CHAIN_ID=1 ./scripts/anvil-rpc-smoke.sh

Seven-network matrix:

    while IFS='|' read -r name envvar chain; do
      url="${!envvar:-}"
      if [[ -z "$url" ]]; then
        echo "SKIP $name: $envvar is unset"
        continue
      fi
      echo "=== $name (chain $chain) ==="
      RPC_URL="$url" EXPECTED_CHAIN_ID="$chain" node scripts/rpc-smoke.mjs
    done <<'MATRIX'
    Ethereum|ETH_RPC_URL|1
    BNB|BSC_RPC_URL|56
    Base|BASE_RPC_URL|8453
    Arbitrum|ARBITRUM_RPC_URL|42161
    Avalanche|AVAX_RPC_URL|43114
    Cronos|CRONOS_RPC_URL|25
    Sonic|SONIC_RPC_URL|146
    MATRIX
