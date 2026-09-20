# RPC validation and test provenance

## Credential model

The project accepts one local ALCHEMY_API_KEY and derives seven network-specific JSON-RPC URLs. The key is never committed, printed, or embedded in source. .env.example contains placeholders only.

The supplied Alchemy credential must be installed locally as ALCHEMY_API_KEY; authorization for each network is not inferred from the key string. A real request to each endpoint is required.

## Seven canonical networks

| Network | Chain ID | Environment |
|---|---:|---|
| Ethereum | 1 | ETH_RPC_URL |
| BNB Chain | 56 | BSC_RPC_URL |
| Base | 8453 | BASE_RPC_URL |
| Arbitrum One | 42161 | ARBITRUM_RPC_URL |
| Avalanche C-Chain | 43114 | AVAX_RPC_URL |
| Cronos | 25 | CRONOS_RPC_URL |
| Sonic | 146 | SONIC_RPC_URL |

## What has actually been proven

Existing unit tests and normal CI tests are deterministic/local tests. They do not prove that the Alchemy endpoint was contacted.

FORK_SIMULATION_VERIFIED remains false until a real Ethereum fork is run with ETH_RPC_URL and the callback/route assertions pass.

scripts/rpc-request-matrix.mjs performs real, read-only JSON-RPC POST requests when populated environment variables are present. It verifies chain identity and exercises chain-state, block, gas, balance, code, eth_call, gas-estimation, transaction lookup and receipt lookup methods.

A successful CI build is therefore not equivalent to successful live-RPC validation.

## Live execution state

EXECUTION_AUTHORIZATION=0
AUTHORIZATION_STATE=LOCKED
LIVE_SIGNING=false
BROADCAST_ENABLED=false
TRANSACTION_SIGNED=false
TRANSACTION_BROADCAST=false
LIVE_EXECUTION_READY=false

## Anvil/fork distinction

Anvil without --fork-url is local chain ID 31337 and is not a real upstream network request.

Anvil with --fork-url "$ETH_RPC_URL" reads upstream Ethereum state at fork creation and is the required next step for fork validation. The fork test remains simulation-only.

## Required evidence before live authorization

1. Seven-network read-only RPC matrix passes where configured endpoints are supported.
2. Ethereum fork starts from ETH_RPC_URL.
3. Aave V3 callback and route assertions pass against the fork.
4. Repayment, final asset and net-profit assertions pass.
5. Post-execution evidence checks pass on the simulated transaction.
6. Only then can the separately controlled signer authorization boundary be reviewed.

No credential is committed to GitHub.
