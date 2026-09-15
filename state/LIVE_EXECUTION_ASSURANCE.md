# Live Execution Assurance Path

This document defines the first production broadcast path without embedding autonomous signing into the bot.

```text
LIVE RPC
  -> live quote
  -> live lender premium
  -> live gas economics
  -> simulation
  -> net profit hard floor ($2)
  -> observation identity
  -> execution-lock record
  -> unsigned external-signer intent
  -> pre-sign guard
  -> independently authorized signer
  -> signed transaction
  -> broadcast RPC
  -> receipt
  -> post-execution verification
```

## Preconditions before a first live broadcast

1. The route is pinned to current chain state.
2. Quote freshness and source identity are valid.
3. Aave premium is read from the live pool at the pinned block.
4. Gas economics are independently estimated.
5. Simulation succeeds.
6. Net profit remains above the hard $2 floor after costs.
7. Observation identity and plan hash remain unchanged.
8. The execution intent has not expired.
9. The pre-sign guard passes against current chain state.
10. A human-controlled/external signer explicitly authorizes signing.

## Explicit boundary

The repository does not store a private key and does not autonomously sign or broadcast real-value transactions. The current execution state remains:

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```

A first live transaction must therefore be an externally authorized transaction after all pre-sign checks pass. A successful simulation, CI run, or signer intent is not evidence that a live transaction was broadcast.
