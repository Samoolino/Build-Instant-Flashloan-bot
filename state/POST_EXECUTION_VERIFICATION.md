# Post-Execution Verification

This layer accepts a transaction hash produced by an independently authorized signer and verifies its receipt. It does not sign, broadcast, or hold private keys.

## Verification sequence

```text
external signer broadcasts
  -> transaction hash
  -> eth_getTransactionReceipt
  -> receipt exists
  -> transaction hash matches
  -> receipt status == success
  -> recipient matches expected executor/entrypoint
  -> block number is valid
  -> gas used is valid
  -> effective gas price is captured
  -> downstream repayment/profit accounting
```

A successful receipt alone does **not** prove that the flash loan was repaid correctly or that profit was realized. Those require transaction/event/balance accounting against the expected observation and plan.

Current safety state remains:

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```
