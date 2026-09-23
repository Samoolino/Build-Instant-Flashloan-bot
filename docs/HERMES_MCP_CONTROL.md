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
