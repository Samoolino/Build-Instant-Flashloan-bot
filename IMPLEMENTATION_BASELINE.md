# Implementation Baseline — 600+ Step Continuation

This repository is the consolidated implementation baseline for the prior 600+ step engineering sequence. The sequence is represented by executable architecture and verification gates, not by reproducing historical terminal narration.

## Core lanes

1. Project/state governance and immutable execution lock.
2. Profitability policy: $2 hard minimum net-profit floor; $100 advisory target.
3. Wallet/frontend separation: no private keys in browser or repository.
4. Bot execution-state guard.
5. Foundry contract build/test lane.
6. Adapter registry and router allowlists.
7. Canonical swap-plan representation and deterministic plan hashing.
8. Exact token/amount/route continuity checks.
9. Fixed first-leg amount and previous-leg-output second-leg semantics.
10. Fresh-quote/expiry/simulation requirements.
11. Aave V3 callback integration test on Ethereum fork.
12. Future atomic route: Aave V3 -> Uniswap V3 -> Sushi V2 -> repayment -> profit accounting.
13. Fork-only verification before any future live authorization.
14. Seven-network expansion boundary: Ethereum, BNB Chain, Base, Arbitrum One, Avalanche C-Chain, Cronos, Sonic.
15. CI build/test/dashboard verification.

## Current execution boundary

```text
EXECUTION_AUTHORIZATION=0
AUTHORIZATION_STATE=LOCKED
LIVE_SIGNING=false
BROADCAST_ENABLED=false
TRANSACTION_SIGNED=false
TRANSACTION_BROADCAST=false
LIVE_EXECUTION_READY=false
MODE=FORK_SIMULATION_ONLY
```

## Current economic boundary

```text
MINIMUM_NET_PROFIT_USD=2
TARGET_PROFIT_USD=100
MINIMUM_PROFIT_IS_HARD_FLOOR=true
TARGET_PROFIT_IS_ADVISORY=true
```

## Non-negotiable route controls

- Adapter allowlist required.
- Router allowlist required per adapter.
- Exact token continuity required between legs.
- First leg must use a fixed amount or explicit loan amount.
- Subsequent legs must use verified previous-leg output, never an assumed static amount.
- Per-leg minimum output required.
- Expiry required.
- Canonical plan hash required.
- Repayment required before profit distribution.
- Final asset and net-profit accounting required.
- Arbitrary router calldata is not an authorization model.
- Private keys are never stored in the frontend.

## Verification semantics

`BUILD_VERIFIED` means the remote CI build passed.
`TESTS_VERIFIED` means the remote CI tests passed.
`FORK_SIMULATION_VERIFIED` becomes true only after an actual Ethereum fork run with `ETH_RPC_URL` and successful callback/route assertions. A compile-only result is insufficient.

The current branch must remain locked even when all simulation checks pass. Live signing and broadcast are a separate authorization boundary.
