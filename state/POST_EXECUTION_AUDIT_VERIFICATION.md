# Post-Execution Audit Verification

The post-execution audit record is a deterministic integrity artifact derived from verified receipt, repayment, realized-profit, and transaction-intent correlation evidence.

## Verification contract

`verifyPostExecutionAuditRecord`:

1. Requires `verified=true`.
2. Requires the locked execution policy: `EXECUTION_AUTHORIZATION=0`, `LIVE_SIGNING=false`, `BROADCAST_ENABLED=false`.
3. Validates transaction, signer, recipient, loan-token, block, amount, gas, and calldata shapes.
4. Requires the repayment transaction hash to equal the execution transaction hash.
5. Requires the repayment block to equal the verified receipt block.
6. Reconstructs the canonical audit payload.
7. Recomputes the SHA-256 audit ID and rejects any mutation with `AUDIT_ID_MISMATCH`.

This is an integrity/replay check only. It does not sign, broadcast, authorize, or submit transactions.

## Evidence chain

```text
execution lock
  -> unsigned external-signer intent
  -> externally supplied transaction correlation
  -> receipt + repayment + realized-profit evidence
  -> immutable audit record
  -> deterministic audit verification
```

The verifier does not treat an audit record as proof that a transaction should be executed. Execution remains outside the bot and requires an independently authorized signer and explicit user authorization.

## Locked boundary

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```
