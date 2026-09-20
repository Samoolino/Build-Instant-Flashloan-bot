# Live RPC validation status

## What the existing tests prove

The normal bot unit suite uses in-memory `RpcTransport` implementations. Those tests validate request construction, parsing, validation and control flow; they do **not** prove that a request reached an external provider.

The Foundry fork tests are different. When `ETH_RPC_URL` is supplied, Foundry creates a real Ethereum fork and reads upstream Ethereum state. The swap venue in the two-leg executor fork test is deterministic/mock, so that test is hybrid rather than a fully live DEX execution.

The dedicated RPC smoke path sends read-only JSON-RPC requests to the configured provider. It never signs or broadcasts a transaction.

## RPC methods covered by the smoke test

- `eth_chainId`
- `net_version`
- `eth_blockNumber`
- `eth_getBlockByNumber`
- `eth_getBlockByHash`
- `eth_gasPrice`
- `eth_getBalance`
- `eth_getCode`
- `eth_call`
- `eth_estimateGas`
- `eth_getTransactionByHash`
- `eth_getTransactionReceipt`

The zero transaction hash is expected to return `null`; this checks endpoint support without using a real transaction.

## Seven-network production-readiness matrix

| Network | Chain ID | Environment variable | Alchemy endpoint |
|---|---:|---|---|
| Ethereum | 1 | `ETH_RPC_URL` | `https://eth-mainnet.g.alchemy.com/v2/<API_KEY>` |
| BNB Chain | 56 | `BSC_RPC_URL` | `https://bnb-mainnet.g.alchemy.com/v2/<API_KEY>` |
| Base | 8453 | `BASE_RPC_URL` | `https://base-mainnet.g.alchemy.com/v2/<API_KEY>` |
| Arbitrum One | 42161 | `ARBITRUM_RPC_URL` | `https://arb-mainnet.g.alchemy.com/v2/<API_KEY>` |
| Avalanche C-Chain | 43114 | `AVAX_RPC_URL` | `https://avax-mainnet.g.alchemy.com/v2/<API_KEY>` |
| Cronos | 25 | `CRONOS_RPC_URL` | `https://cronos-mainnet.g.alchemy.com/v2/<API_KEY>` |
| Sonic | 146 | `SONIC_RPC_URL` | `https://sonic-mainnet.g.alchemy.com/v2/<API_KEY>` |

A single Alchemy API key only works for networks enabled for that Alchemy app. A key string by itself is not proof that every endpoint is enabled.

## Credential rule

Never commit the supplied API key to GitHub, `.env.example`, shell history, CI logs, or terminal transcripts. Keep it in `ALCHEMY_API_KEY` in the local environment and source `scripts/alchemy-rpc-env.sh`.

Because an API credential was pasted into conversation history, rotate/revoke it in Alchemy if it is an active production credential and use the replacement locally.

## Execution state

RPC read validation is **not** live transaction execution.

Current repository execution boundary remains:

    EXECUTION_AUTHORIZATION=0
    AUTHORIZATION_STATE=LOCKED
    LIVE_SIGNING=false
    BROADCAST_ENABLED=false
    TRANSACTION_SIGNED=false
    TRANSACTION_BROADCAST=false
    LIVE_EXECUTION_READY=false

A successful RPC smoke matrix therefore means **live read access verified**, not that a flash-loan transaction was signed or broadcast.
