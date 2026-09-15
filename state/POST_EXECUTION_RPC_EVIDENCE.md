# RPC-Backed Post-Execution Evidence

The post-execution evidence layer now reads its critical evidence directly from the chain rather than accepting receipt logs or final loan-asset balance as trusted caller-supplied values.

## Evidence path

```text
execution lock
  -> chain ID verification
  -> transaction receipt from RPC
  -> receipt logs from RPC
  -> exact executor -> lender repayment Transfer
  -> final loan-asset balance via eth_call at receipt block
  -> lock-bound realized profit verification
  -> composed post-execution evidence
  -> immutable audit record
```

The final balance is queried with `eth_call` against the receipt block, preserving a deterministic historical observation instead of using `latest` state.

## Boundary

This is an observation and verification layer only. It does not sign, broadcast, manage private keys, or grant execution authority.

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```

RPC-backed evidence does not itself establish that a transaction was safe to execute; it establishes what the configured RPC reports for the externally executed transaction and binds that evidence to the existing execution lock.
