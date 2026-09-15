# Transaction-to-Intent Correlation

This layer binds a transaction observed after external signing/broadcast to the exact unsigned signer intent, execution-lock observation, plan hash, and verified post-execution evidence.

## Required bindings

- `observationId` must equal the execution-lock record and signer intent.
- `planHash` must equal the execution-lock record and signer intent.
- `chainId` must equal the execution-lock record.
- actual transaction `to`, `data`, and `valueWei` must exactly match the unsigned intent.
- transaction hash must match the verified receipt and evidence.
- repayment amount and minimum-profit policy must remain lock-consistent.

## Safety boundary

This component does not sign, hold private keys, authorize execution, or broadcast transactions. The correlated record remains explicitly marked:

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```

A verified correlation is an audit/evidence result, not permission for autonomous financial execution.
