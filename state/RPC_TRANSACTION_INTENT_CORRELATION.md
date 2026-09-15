# RPC Transaction-to-Intent Correlation

The transaction correlation boundary now reads the externally broadcast transaction directly from the configured JSON-RPC transport before accepting it as correlated execution evidence.

Flow:

execution lock
  -> unsigned external signer intent
  -> explicit external signer authorization
  -> externally produced/broadcast transaction
  -> `eth_chainId`
  -> `eth_getTransactionByHash`
  -> expected signer/target/calldata/value verification
  -> receipt/evidence correlation
  -> immutable audit record

The verifier requires an expected external signer address supplied by the caller. It does not custody a private key, sign a transaction, or broadcast a transaction.

The transaction must match the locked observation and plan identity, chain, intent target, calldata, value, and verified post-execution evidence.

## Safety state

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
TRANSACTION_SIGNED=false
TRANSACTION_BROADCAST=false
```

This layer is verification-only. A successful correlation is evidence that an externally authorized transaction matches the intended locked operation; it does not grant execution authority.