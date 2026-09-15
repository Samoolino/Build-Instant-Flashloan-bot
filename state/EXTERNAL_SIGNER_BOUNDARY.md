# External Signer Boundary

The engine now exposes an unsigned `EXTERNAL_SIGNER_INTENT` derived from an `EXECUTION_LOCKED` record.

The intent carries the observation identity, chain, transaction target/data/value, plan hash, loan/repayment context, minimum profit and a short expiry window.

This layer deliberately does **not** hold a private key, sign a transaction, or broadcast a transaction.

Required invariant:

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```

An expired intent must be rejected before any external signer workflow proceeds. The external signer remains an independent authorization boundary.
