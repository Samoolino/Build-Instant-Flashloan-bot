#!/usr/bin/env bash
set -euo pipefail

# Hermes Ubuntu bootstrap for Build-Instant-Flashloan-bot.
# This script never accepts, stores, prints, or writes a wallet private key.
# Signing remains an external authorization boundary.

cd "${HOME}/Build-Instant-Flashloan-bot"

echo "[1/6] Installing/updating Hermes"
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

echo "[2/6] Checking Hermes"
command -v hermes >/dev/null
hermes --version || true

echo "[3/6] Portal setup"
echo "If you have a Nous Portal subscription, the following command configures the provider/tool gateway:"
hermes setup --portal

echo "[4/6] Creating local API-server configuration"
mkdir -p "${HOME}/.hermes"
API_KEY="${API_SERVER_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  API_KEY="$(openssl rand -hex 32)"
fi
chmod 700 "${HOME}/.hermes"
touch "${HOME}/.hermes/.env"
chmod 600 "${HOME}/.hermes/.env"

upsert() {
  local key="$1" value="$2" file="${HOME}/.hermes/.env"
  if grep -qE "^${key}=" "$file"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

upsert API_SERVER_ENABLED true
upsert API_SERVER_HOST 127.0.0.1
upsert API_SERVER_PORT 8642
upsert API_SERVER_KEY "$API_KEY"
upsert API_SERVER_CORS_ORIGINS ""
upsert HERMES_TARGET_PROFIT_USD 200
upsert HERMES_MINIMUM_NET_PROFIT_USD 2

echo "[5/6] Preparing bot-side execution environment"
cat > "${HOME}/Build-Instant-Flashloan-bot/.env.hermes.local" <<'EOF'
# Local Hermes integration; secrets stay outside git.
HERMES_LIVE_EXECUTION=0
HERMES_BROADCAST=0
HERMES_TARGET_PROFIT_USD=200
HERMES_MINIMUM_NET_PROFIT_USD=2
# Set these only through your secret manager/environment after external signer deployment:
# HERMES_EXTERNAL_SIGNER_URL=
# HERMES_EXTERNAL_SIGNER_TOKEN=
# HERMES_BROADCAST_RPC_URL=
# HERMES_PROFIT_OBSERVER_URL=
EOF
chmod 600 "${HOME}/Build-Instant-Flashloan-bot/.env.hermes.local"

echo "[6/6] Starting Hermes gateway in tmux"
if command -v tmux >/dev/null 2>&1; then
  tmux new-session -d -s hermes-agent 'hermes gateway'
  echo "Hermes gateway session: tmux attach -t hermes-agent"
else
  echo "tmux is not installed. Start manually with: hermes gateway"
fi

echo
echo "Hermes API: http://127.0.0.1:8642/v1"
echo "API key file: ${HOME}/.hermes/.env (mode 600)"
echo "Pilot target: $200 cumulative realized profit; hard floor: $2 per candidate."
echo "LIVE EXECUTION remains disabled until a verified external signer, deployed executor/route, funded wallet, and explicit runtime gates are configured."
