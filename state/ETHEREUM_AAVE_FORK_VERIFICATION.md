# Ethereum Aave V3 Fork Verification

This gate proves the repository's Ethereum-specific flash-loan implementation against real Ethereum upstream state without signing or broadcasting a transaction.

## Required input

Set a read-only Ethereum JSON-RPC endpoint in the current shell:

```bash
export ETH_RPC_URL='https://...'
```

Do not commit the endpoint or credential.

## What the gate proves

1. `scripts/rpc-smoke.mjs` reaches the configured Ethereum endpoint and verifies chain ID 1.
2. `scripts/verify-locked-state.mjs` confirms the execution boundary remains locked.
3. `AaveFlashLoanCallbackForkTest` creates a Foundry Ethereum fork and invokes the deployed Aave V3 pool.
4. `AaveFlashArbExecutorForkTest` exercises the executor, Aave callback, two swap legs, repayment, and minimum-profit assertion on the fork.
5. No private key, signer, transaction broadcast, or Ethereum mainnet transaction is used.

## Command

```bash
export ETH_FORK_VERIFY_LOG_DIR="$HOME/Desktop/build-instant-flashloan-ethereum-fork"
./scripts/verify-ethereum-aave-fork.sh
```

A successful run is the evidence required to change the project state from `FORK_SIMULATION_VERIFIED=false` to true. That state transition must only be recorded after the command actually succeeds with a populated `ETH_RPC_URL`.

## Important distinction

A seven-network Anvil matrix validates transport and shared implementation behavior. This Ethereum gate additionally validates the chain-specific Aave V3 callback and executor route against real Ethereum fork state.
