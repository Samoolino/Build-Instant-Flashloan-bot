# Hermes Ubuntu Integration

This branch integrates Hermes as the agentic orchestration/control plane for the flashloan bot.

## 1. Install Hermes

On Ubuntu:

```bash
cd ~/Build-Instant-Flashloan-bot
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes --version
```

For a Portal-backed provider/tool gateway:

```bash
hermes setup --portal
```

## 2. Configure the local API server

Hermes listens on loopback port 8642 by default. Create `~/.hermes/.env` with a locally generated bearer key:

```bash
mkdir -p ~/.hermes
chmod 700 ~/.hermes
printf 'API_SERVER_ENABLED=true\nAPI_SERVER_HOST=127.0.0.1\nAPI_SERVER_PORT=8642\nAPI_SERVER_KEY=%s\n' "$(openssl rand -hex 32)" > ~/.hermes/.env
chmod 600 ~/.hermes/.env
```

Do not expose the API server publicly unless an explicit CORS/network policy is configured.

Start it:

```bash
hermes gateway
```

Health check:

```bash
curl -fsS http://127.0.0.1:8642/health
```

Authenticated capability check:

```bash
source ~/.hermes/.env
curl -fsS http://127.0.0.1:8642/v1/capabilities \
  -H "Authorization: Bearer $API_SERVER_KEY"
```

## 3. Connect the flashloan bot

The repository's live corridor is:

`UNSIGNED_INTENT -> LIVE_STRATEGY_QUOTE -> LIVE_ROUTE_SIMULATION -> EXTERNAL_SIGNER -> BROADCAST -> RECEIPT -> REALIZED_PROFIT -> AGENTIC_FEEDBACK`

Configure the bot only through environment/secrets:

```bash
export HERMES_TARGET_PROFIT_USD=200
export HERMES_MINIMUM_NET_PROFIT_USD=2
export HERMES_BROADCAST_RPC_URL='...'
export HERMES_EXTERNAL_SIGNER_URL='...'
export HERMES_EXTERNAL_SIGNER_TOKEN='...'
export HERMES_PROFIT_OBSERVER_URL='...'
```

The live runner requires:

```bash
export HERMES_LIVE_EXECUTION=1
export HERMES_BROADCAST=1
```

The repository intentionally does not put a private key into Hermes. The external signer must validate the exact intent, chain, recipient, calldata, nonce, expiry, gas policy, and wallet policy before returning a signed raw transaction.

## 4. Pilot target

The pilot target is now **$200 cumulative realized profit**, with the existing **$2 minimum net-profit hard floor** per candidate. The $200 value is a stopping target, not permission to execute an unbounded number of transactions.

A controller should stop creating new execution intents once cumulative realized profit reaches or exceeds $200. Each transaction must independently pass quote freshness, route simulation, repayment, gas, minimum-profit, expiry, and signer policy checks.

## 5. Live-funds prerequisites

Before enabling live execution, verify all of the following from the Ubuntu host:

1. A newly rotated signer key exists in a secure secret manager or signer service. Never paste it into chat, GitHub, Hermes config, shell history, or the repository.
2. The wallet has the native gas asset on the selected pilot chain.
3. The flashloan executor contract is deployed on that same chain and its address/ABI are verified.
4. The lender and DEX/router adapters are deployed and allowlisted.
5. The selected route has been successfully simulated against a live RPC.
6. The external signer rejects stale or altered intents.
7. The broadcast RPC is the same network as the signed transaction.
8. The profit observer measures token balance delta minus gas and repayment, rather than trusting a predicted quote.
9. A manual approval remains required for the first live transaction.

## 6. Important credential handling

A private key pasted into a chat should be treated as compromised. Do not use it for a live wallet. Rotate/revoke it and fund a newly generated pilot wallet instead.

Hermes's `API_SERVER_KEY`, Portal credentials, RPC credentials, and external signer token are also secrets. Store them in `~/.hermes/.env`, a systemd/secret-manager environment, or another protected secret store; never commit them.

The GitHub branch documents and implements the execution boundary, but a repository state is not evidence that a live wallet, signer, deployed route, or successful live transaction exists.
