# Post-Execution Audit Record

The post-execution audit record is the immutable correlation point for an externally executed engagement.

## Evidence chain

```text
locked observation
  -> external transaction receipt
  -> repayment Transfer evidence
  -> final loan-asset balance
  -> realized profit
  -> deterministic audit ID
```

The audit record binds the observation ID, chain ID, transaction hash, receipt block, plan hash, loan asset and amount, repayment amount, repayment transaction/block, final balance, realized profit, minimum profit, gas usage and effective gas price.

The audit ID is a deterministic SHA-256 identity over the canonicalized evidence payload. Rebuilding the same evidence must produce the same ID.

## Safety boundary

This record is produced only from already-verified evidence. It does not sign, broadcast, hold private keys, or grant execution authorization.

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```
