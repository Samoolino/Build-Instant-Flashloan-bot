# Build-Instant-Flashloan-bot

Institutional flash-loan / arbitrage execution architecture.

## Project state

This repository is the canonical GitHub project identity for the local `premium-flash-dapp` implementation. The repository was initially empty; the first commit establishes the runnable-project contract and execution-state boundary.

## Execution safety state

```text
EXECUTION_AUTHORIZATION=0
AUTHORIZATION_STATE=LOCKED
LIVE_SIGNING=false
BROADCAST_ENABLED=false
TRANSACTION_SIGNED=false
TRANSACTION_BROADCAST=false
LIVE_EXECUTION_READY=false
```

These values are intentionally locked. A repository update does not authorize blockchain execution.

## Architecture target

- Premium React/Next.js trading dashboard
- Backend execution engine
- EVM flash-loan route construction
- Aave V3 lender integration boundary
- DEX adapter model rather than arbitrary router calls
- Uniswap V3 and Sushi V2 route support boundary
- Canonical plan hashing
- Exact calldata binding
- Atomic simulation before any future live authorization
- Repayment and minimum-net-profit verification
- Explicit human authorization boundary
- Private keys excluded from the browser and repository

## Canonical network matrix

1. Ethereum — chain 1
2. BNB Chain — chain 56
3. Base — chain 8453
4. Arbitrum One — chain 42161
5. Avalanche C-Chain — chain 43114
6. Cronos — chain 25
7. Sonic — chain 146

Network credentials/RPC secrets are configuration inputs and must not be committed.

## Profitability policy

```text
MINIMUM_NET_PROFIT_USD=2
TARGET_PROFIT_USD=100
MINIMUM_PROFIT_IS_HARD_FLOOR=true
TARGET_PROFIT_IS_ADVISORY=true
```

A candidate below the $2 USD net-profit floor must be rejected. The $100 target is advisory and does not override the hard floor.

## Ethereum fork verification

The repository contains an explicit fork-only Aave V3 callback test at `contracts/test/AaveFlashLoanCallbackFork.t.sol`. It requires an Ethereum JSON-RPC endpoint through `ETH_RPC_URL`, creates a local Foundry fork, and does not broadcast to Ethereum mainnet.

For reproducible remote verification, the `Ethereum Fork Verification` workflow is manually dispatched and reads the endpoint only from the GitHub Actions secret named `ETH_RPC_URL`. The secret value is never printed or committed. Configure the supplied Ethereum JSON-RPC endpoint as that secret before dispatching the workflow.

A green normal CI run proves build/tests against the repository's deterministic test environment. It does **not** by itself prove that an Ethereum fork was executed. Fork verification is only marked verified after the dedicated fork workflow completes successfully with the RPC secret configured.

## Development state

The complete local implementation may contain additional generated execution-state artifacts under `state/`. Those artifacts must remain locked to simulation/review until an explicit future authorization boundary is satisfied.

This repository's GitHub state is not evidence that a local build, test, fork simulation, quote, or transaction succeeded. Those claims require reproducible command output and/or CI evidence.
