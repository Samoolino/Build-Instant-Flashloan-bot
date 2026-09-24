# Live Agentic Execution — 100% Stage Map

The implementation corridor is:

UNSIGNED_INTENT
-> LIVE_STRATEGY_QUOTE
-> LIVE_ROUTE_SIMULATION
-> EXTERNAL_SIGNER
-> BROADCAST
-> RECEIPT
-> REALIZED_PROFIT
-> AGENTIC_FEEDBACK

## Stage definitions

| Stage | Implemented component | Completion contract |
|---|---|---|
| Unsigned intent | external-signer-intent.ts | Immutable, expiring intent |
| Live strategy/quote | live-execution-pipeline.ts / LiveStrategyAdapter | Fresh quote, minimum output, verified economics |
| Live route simulation | live-execution-pipeline.ts / LiveRpc | eth_call/eth_estimateGas adapter boundary |
| External signer | hermes-live-gateway.mjs / ExternalSigner | Remote signer only; no private key in Hermes |
| Broadcast | hermes-live-gateway.mjs | eth_sendRawTransaction behind explicit gates |
| Receipt | live-execution-pipeline.ts | Poll receipt and reject reverted transaction |
| Realized profit | ProfitObserver | Post-receipt realized-profit measurement |
| Agentic feedback | LiveExecutionResult.feedback | Predicted vs realized variance |

## Production gate

The live gateway requires all of:

- HERMES_LIVE_EXECUTION=1
- HERMES_BROADCAST=1
- HERMES_EXTERNAL_SIGNER_URL
- HERMES_EXTERNAL_SIGNER_TOKEN
- HERMES_BROADCAST_RPC_URL
- A valid, unexpired unsigned intent

No private key is stored in Hermes and no signing credential is logged.

## Agentic control

Hermes remains the strategy/orchestration layer. Deterministic economics, quote freshness, simulation, execution lock and signer-intent validation remain mandatory gates.

A live transaction is only considered complete after:

1. external signing succeeds;
2. broadcast returns a transaction hash;
3. the receipt is mined with success status;
4. realized profit is measured;
5. predicted-versus-realized feedback is recorded.

“100%” here means every lifecycle stage has an implemented software contract and adapter boundary. It does not mean that a real signer, funded wallet, deployed route, or live transaction has been verified by this commit.
