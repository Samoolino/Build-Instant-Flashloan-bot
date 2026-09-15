# Runnable Project & Execution State

## Remote project identity

- Repository: `Samoolino/Build-Instant-Flashloan-bot`
- Default branch: `main`
- Canonical local project target: `~/premium-flash-dapp`

## Current state

```text
PROJECT_STATE=REMOTE_SKELETON_ESTABLISHED
SOURCE_IMPLEMENTATION_SYNCED=false
BUILD_VERIFIED=true
TESTS_VERIFIED=true
REMOTE_CI_GREEN=true
FORK_SIMULATION_VERIFIED=false

EXECUTION_AUTHORIZATION=0
AUTHORIZATION_STATE=LOCKED
LIVE_SIGNING=false
BROADCAST_ENABLED=false
TRANSACTION_SIGNED=false
TRANSACTION_BROADCAST=false
LIVE_EXECUTION_READY=false
```

`REMOTE_CI_GREEN=true` is backed by GitHub Actions run `34976435766` on commit `3740fa402d58c0833043fc6fe428a82944d8ffb2`. The run completed successfully after the Next.js root-layout repair.

`BUILD_VERIFIED=true` and `TESTS_VERIFIED=true` refer to the successful remote CI build/test lane. They do not claim that an external local checkout has been synchronized or verified.

## Required runnable tree

```text
contracts/
bot/
dapp-dashboard/
state/
package.json
foundry.toml
README.md
.gitignore
```

The source tree must be populated from the verified local implementation before claiming that this remote repository is synchronized with `~/premium-flash-dapp`.

## Execution architecture

The intended execution lane is:

1. Discover opportunity.
2. Build exact route.
3. Obtain fresh quotes.
4. Apply the hard minimum-net-profit gate.
5. Construct canonical execution plan.
6. Bind exact calldata and plan hash.
7. Simulate atomically.
8. Reconcile repayment, intermediate output, final asset and net profit.
9. Human review.
10. Explicit authorization boundary.
11. Only then could a separately controlled live-signing lane be considered.

No step above implicitly authorizes broadcasting.

## Profitability policy

```text
MINIMUM_NET_PROFIT_USD=2
TARGET_PROFIT_USD=100
MINIMUM_PROFIT_IS_HARD_FLOOR=true
TARGET_PROFIT_IS_ADVISORY=true
```

A candidate below the $2 USD net-profit floor is rejected. The $100 target is advisory.

## Security requirements

- Never commit private keys, seed phrases, RPC secrets or wallet keystore contents.
- Never place private keys in the frontend.
- Never use arbitrary router calls as the execution security model.
- Use adapter and router allowlists.
- Require exact token/amount/route continuity.
- Require repayment before profit distribution.
- Require fresh quotes and expiry.
- Require canonical plan-hash parity.
- Require atomic simulation before any future live authorization.

## Verification rule

GitHub repository existence or a successful GitHub commit is **not** evidence that the local application compiles, tests, simulates, or executes successfully. Those states require actual build/test/simulation evidence.

## Current gate

```text
CI_REPAIR=VERIFIED
REMOTE_BUILD=PASS
REMOTE_TESTS=PASS
DASHBOARD_BUILD=PASS
FORK_SIMULATION=NOT_VERIFIED
LIVE_SIGNING=DISABLED
BROADCAST=DISABLED
AUTHORIZATION=0
```

The next implementation gate is a real Ethereum mainnet-fork simulation lane. It must remain simulation-only until its complete route, repayment, intermediate-output, final-asset and net-profit assertions are independently verified.
