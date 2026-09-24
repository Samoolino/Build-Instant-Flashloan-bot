# Hermes <-> Bot MCP Control Interface

This phase exposes a local deterministic MCP-compatible control surface for Hermes Agent.

## Boundary

Hermes is an orchestration client. The bot remains authoritative for execution state, economic-floor enforcement, simulation and lock requirements, unsigned-intent construction, signing, and broadcasting.

The MCP server does not expose private keys and has no tool for eth_sendRawTransaction, transaction signing, wallet export, or execution authorization.

## Tools

| Tool | Purpose | Mutability |
|---|---|---|
| get_execution_state | Read current execution lock state | Read-only |
| evaluate_opportunity | Run deterministic agentic-board policy | Read-only |
| create_unsigned_intent | Create unsigned intent after lock-policy validation | Metadata only |

Every response carries a correlation ID and deterministic audit ID. BigInt values are serialized as decimal strings.

## Hermes connection

Run: npm --prefix bot run hermes:mcp

Example stdio configuration:
{"mcpServers":{"flash-arb7-control":{"command":"npm","args":["--prefix","bot","run","hermes:mcp"]}}}

Do not place RPC URLs, API keys, seed phrases, private keys, or signer credentials in this configuration.

## Agentic loop

Hermes observation -> evaluate_opportunity -> investigate/requote/simulate -> deterministic lock -> create_unsigned_intent -> external signer/human authorization -> external broadcast -> RPC receipt verification -> post-execution audit -> Hermes learns from evidence.

The MCP layer intentionally stops before signing and broadcasting. Later autonomy must add deterministic authorization gates rather than granting the agent transaction authority.
## Live RPC bridge

Hermes may invoke the read-only RPC bridge after the environment has been loaded with `scripts/alchemy-rpc-env.sh`. It checks chain ID, latest block, and gas price across the seven configured EVM networks. It never prints credentials, signs transactions, or broadcasts transactions.

Run: `source scripts/alchemy-rpc-env.sh && node bot/src/hermes-rpc-bridge.mjs`


## Ubuntu Hermes bot screen

The repository includes `scripts/start-hermes-screen.sh`, which creates a persistent tmux screen with separate control, live-RPC observation, MCP, agentic-board, and test windows.

Start it from Ubuntu:

```bash
cd ~/Build-Instant-Flashloan-bot
chmod +x scripts/start-hermes-screen.sh
./scripts/start-hermes-screen.sh
tmux attach -t flash-arb7-hermes
```

The screen is deliberately an implementation/control console rather than an autonomous signer. It keeps signing disabled, broadcast disabled, and execution authorization at zero. Live implementation may therefore proceed through observation, quoting, simulation, audit and unsigned intent generation, while the final signing/broadcast boundary remains external.


## Agentic run to live-funds readiness

The agentic run is a staged state machine:

1. **OBSERVE** — read live RPC health/block/gas state.
2. **VERIFY** — reject missing or mismatched RPCs.
3. **STRATEGIZE** — consume a verified opportunity produced by the strategy/quote adapters; Hermes does not invent profitability.
4. **ECONOMICS** — require fresh quote, lender premium/repayment, gas and a verified net-profit calculation. The repository economic floor is currently USD 2 unless explicitly configured otherwise.
5. **SIMULATE** — require a successful simulation against the relevant state.
6. **EXECUTION_LOCKED** — bind the opportunity to its observation, plan hash and execution context.
7. **UNSIGNED_INTENT** — construct transaction metadata for an external signer.
8. **EXTERNAL_AUTH_REQUIRED** — stop before signing/broadcast.

Run the coordinator with:

```bash
cd ~/Build-Instant-Flashloan-bot
source scripts/alchemy-rpc-env.sh
npm --prefix bot run hermes:run
```

A verified candidate can be supplied with `HERMES_CANDIDATE_JSON=/path/to/candidate.json`. The coordinator will reject candidates that fail the RPC, quote, economics or simulation gates.

### Live-funds design

The production path is intentionally split into two authorities:

```text
Hermes
  -> observe
  -> strategy
  -> quote
  -> lender economics
  -> simulation
  -> execution lock
  -> unsigned intent
                 |
                 v
        external authorization
                 |
                 v
          signer / wallet
                 |
                 v
            broadcaster
                 |
                 v
         receipt verification
                 |
                 v
          audit / feedback
```

Hermes therefore becomes the agentic board and control plane without becoming the holder of private keys. The first live-funds transaction should only be attempted after the unsigned intent has been independently reviewed and authorized by the configured signer boundary.
