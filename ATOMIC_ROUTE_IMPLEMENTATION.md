# Atomic Route Implementation Baseline

This document is the executable architecture baseline for the consolidated 600+ engineering steps. It is intentionally implementation-oriented: every control below must exist in code, tests, CI, or an explicit deployment gate before live execution is permitted.

## State boundary

```text
MODE=FORK_SIMULATION_ONLY
LIVE_SIGNING=false
BROADCAST_ENABLED=false
EXECUTION_AUTHORIZATION=0
PRODUCTION_EXECUTION_ALLOWED=false
```

## Atomic route

```text
Aave V3 flashLoanSimple
  -> lender callback authentication
  -> canonical plan/hash validation
  -> leg 1 adapter/router allowlist validation
  -> leg 1 exact amount + minimum output
  -> observe output token balance delta
  -> leg 2 amount = verified previous-leg output
  -> leg 2 adapter/router allowlist validation
  -> final asset continuity
  -> verify principal + premium repayment
  -> verify net profit >= $2 hard floor
  -> record canonical plan hash / accounting
  -> repay lender
  -> account profit to approved recipient
```

## Required invariants

1. Chain ID is bound to the deployment and plan.
2. Plan expiry is mandatory.
3. Asset/token continuity is mandatory for every leg.
4. Every adapter and router is allowlisted.
5. The first leg may use a fixed amount; subsequent legs must use verified previous-leg output.
6. Previous-leg output is measured as a balance delta, never as an unrestricted executor balance.
7. Every leg has an exact minimum output.
8. Final balance must cover principal plus lender premium.
9. Net profit must satisfy the configured hard floor; the target is advisory only.
10. Canonical plan hashing includes all economic and routing fields, including amount-source semantics and calldata hash.
11. Stale quote, stale expiry, amount mismatch, token mismatch, unauthorized caller, unauthorized initiator, unauthorized router, insufficient repayment, and insufficient profit are rejected.
12. Private keys are never stored in browser code or committed to the repository.
13. CI must compile, test, and build the contract, bot, and dashboard before a merge is considered green.
14. Live signing and transaction broadcast remain independently disabled until an explicit authorization procedure changes both controls.

## Accounting primitive

`contracts/src/RouteAccounting.sol` provides deterministic balance-delta and final-repayment accounting. It deliberately does not infer profit from an executor's arbitrary pre-existing balance.

## Verification stages

### Stage A — static/build

- Solidity compilation
- unit tests
- bot build
- dashboard build
- locked-state verification

### Stage B — fork callback

- Ethereum mainnet fork supplied through `ETH_RPC_URL`
- Aave V3 callback is actually invoked
- principal/premium repayment succeeds inside the fork
- callback caller and initiator are verified

### Stage C — atomic two-leg fork route

- real fork state
- real allowlisted adapters/routers
- real token balances
- verified intermediate balance delta
- final repayment
- $2 minimum net-profit assertion
- canonical plan hash parity

### Stage D — controlled authorization review

This stage is blocked by default. It cannot be inferred from a successful fork simulation.

## No-live-execution rule

A successful CI run or fork simulation does not authorize mainnet broadcasting. The production gate remains closed until authorization, signing, and broadcast are independently reviewed and enabled.
