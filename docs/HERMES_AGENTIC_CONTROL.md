# Hermes Agentic Control Plane

The bot is being evolved toward an agentic strategy using [Hermes Agent](https://github.com/NousResearch/hermes-agent) as an operator-facing agentic board and control plane.

Hermes is **not** the signer, wallet, transaction broadcaster, or source of execution authority. The integration is deliberately split:

`LIVE RPC / QUOTES / LENDER ECONOMICS`
→ `AGENTIC BOARD`
→ `DETERMINISTIC SAFETY GATES`
→ `EXECUTION LOCK`
→ `EXTERNAL SIGNER / HUMAN AUTHORIZATION`

## Board responsibilities

- Observe RPC/provider health and quote freshness.
- Investigate degraded networks.
- Request re-quotes when observations become stale.
- Evaluate strategy candidates against the configurable net-profit floor (currently $2).
- Request simulation before an opportunity can progress.
- Queue an **unsigned external-signer intent** when all deterministic gates pass.
- Record decisions and reasons for auditability.

## Explicit non-responsibilities

Hermes must not:

- hold private keys;
- sign transactions;
- call `eth_sendRawTransaction`;
- enable `LIVE_SIGNING`;
- enable `BROADCAST_ENABLED`;
- override the execution lock;
- change the economic floor without an explicit configuration change;
- treat an LLM decision as proof of profitability.

The TypeScript `agentic-board` module is deterministic. Hermes supplies orchestration, memory, investigation and strategy hypotheses; deterministic bot modules remain authoritative for RPC, quotes, simulation, profitability and execution-state checks.

## Initial agent roles

1. **Strategy Orchestrator** — coordinates opportunity evaluation and chooses the next allowed observation step.
2. **Market Analyst** — compares live quotes, liquidity and gas observations.
3. **Risk Controller** — checks freshness, chain health, simulation status and execution locks.
4. **Execution Coordinator** — prepares external-signer intents but cannot sign or broadcast.
5. **Audit Reviewer** — verifies evidence and explains rejected/accepted transitions.

The first production stage is read-only agentic control. Promotion toward greater autonomy must add deterministic policy gates, approval boundaries, replay tests and audit evidence rather than allowing the LLM to bypass them.
