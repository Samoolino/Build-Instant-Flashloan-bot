# Live Engagement State

The bot now exposes an observation-only live engagement state for real-time quote and simulation monitoring.

## State model

```text
IDLE
  -> DISCOVERING
  -> QUOTING
  -> SIMULATING
  -> PROFITABLE | REJECTED
  -> EXECUTION_LOCKED
```

A `PROFITABLE` observation means only that the current verified inputs satisfy the planner's economics and simulation gates. It is not permission to sign or broadcast a transaction.

## Execution boundary

Every live engagement state is explicitly constrained to:

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```

`lockForExecution()` changes the state to `EXECUTION_LOCKED` while preserving those values at zero/false. A rejected or unsimulated state cannot enter the execution lock.

## Live inputs

An engagement observation records:

- canonical EVM chain ID;
- quote/source identities;
- optional block number used for the quote;
- observation timestamp;
- simulation result;
- profitability eligibility.

This provides the state boundary needed to connect live RPC/quote feeds without conflating market observation with transaction authorization.
