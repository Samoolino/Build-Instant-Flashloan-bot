# RPC implementation coverage and validation gate

## Purpose

This document defines the RPC evidence required for every live-data implementation currently present in the bot. Unit tests using an in-memory `RpcTransport` are deterministic tests only; they are not evidence that a provider was contacted.

## Canonical seven-network matrix

| Network | Chain ID | RPC env |
|---|---:|---|
| Ethereum | 1 | ETH_RPC_URL |
| BNB Chain | 56 | BSC_RPC_URL |
| Base | 8453 | BASE_RPC_URL |
| Arbitrum One | 42161 | ARBITRUM_RPC_URL |
| Avalanche C-Chain | 43114 | AVAX_RPC_URL |
| Cronos | 25 | CRONOS_RPC_URL |
| Sonic | 146 | SONIC_RPC_URL |

Every endpoint must independently return the expected chain ID. A shared API-key string is not evidence that every network is enabled.

## RPC methods required by the implemented layers

| Implemented layer | Required RPC evidence |
|---|---|
| chain-state / freshness | eth_chainId, eth_blockNumber, eth_getBlockByNumber |
| ERC-20 reader | eth_call at latest for decimals, symbol and balanceOf |
| Aave V3 premium | eth_call at the pinned block |
| Uniswap V3 quote | eth_blockNumber, eth_getBlockByNumber, eth_call at the pinned block |
| transaction correlation | eth_chainId, eth_getTransactionByHash |
| receipt verification | eth_getTransactionReceipt |
| repayment evidence | transaction receipt logs from eth_getTransactionReceipt |
| post-execution balance | eth_call at the exact receipt block |
| generic RPC health | eth_chainId, net_version, eth_blockNumber, eth_getBlockByNumber, eth_getBlockByHash, eth_gasPrice, eth_getBalance, eth_getCode, eth_call, eth_estimateGas, transaction and receipt lookup |

## Evidence classes

1. **Unit RPC tests** — mocked/in-memory transport. Proves request construction and validation only.
2. **Direct provider smoke** — real JSON-RPC POSTs to each configured provider. Proves read connectivity and method support.
3. **Anvil fork smoke** — local Anvil backed by an upstream provider. Proves fork acquisition, not upstream broadcast.
4. **Ethereum Foundry fork** — `ETH_RPC_URL` is used by `vm.createSelectFork`. Proves access to real Ethereum state. The current two-leg executor test retains a deterministic/mock swap venue, so it is hybrid rather than a fully live DEX execution.
5. **Post-execution RPC evidence** — requires a real transaction hash supplied externally; it verifies chain, transaction, receipt, logs and balance at the receipt block. It does not sign or broadcast.

## Required validation order

```text
7/7 direct RPC endpoints
        ↓
chain IDs match
        ↓
core RPC method matrix passes
        ↓
Ethereum fork starts from ETH_RPC_URL
        ↓
Aave callback fork test passes
        ↓
two-leg executor fork test passes
        ↓
live quote + pinned block consistency
        ↓
live Aave premium at same block
        ↓
profitability ≥ $2 hard floor
        ↓
plan/calldata correlation
        ↓
externally supplied transaction correlation
        ↓
receipt + repayment + final balance
        ↓
immutable post-execution audit verification
```

## Current safety boundary

```text
EXECUTION_AUTHORIZATION=0
AUTHORIZATION_STATE=LOCKED
LIVE_SIGNING=false
BROADCAST_ENABLED=false
TRANSACTION_SIGNED=false
TRANSACTION_BROADCAST=false
LIVE_EXECUTION_READY=false
```

RPC validation must remain read-only. A green RPC matrix is evidence of provider access, not authorization to sign or broadcast.

## Credential handling

Keep complete provider URLs only in environment variables or GitHub Actions secrets. Never commit the API key, print it, or put it into transcripts. The repository's `scripts/alchemy-rpc-env.sh` derives the seven URLs from `ALCHEMY_API_KEY`.

## Local Ubuntu acceptance commands

```bash
cd ~/Build-Instant-Flashloan-bot
export ALCHEMY_API_KEY='REPLACEMENT_KEY'
source scripts/alchemy-rpc-env.sh
bash scripts/ubuntu-rpc-live-validate.sh
```

The validator writes one transcript per network under:

```text
$HOME/Desktop/build-instant-flashloan-live-rpc/
```

For Ethereum fork smoke:

```bash
ANVIL_FORK_URL="$ETH_RPC_URL" EXPECTED_CHAIN_ID=1 bash scripts/anvil-rpc-smoke.sh
```

No command in this validation gate signs or broadcasts a transaction.
