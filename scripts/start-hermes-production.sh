#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
export HERMES_PROJECT_ROOT="$PWD"
source scripts/alchemy-rpc-env.sh
chmod +x scripts/start-hermes-screen.sh
./scripts/start-hermes-screen.sh
echo
echo "Hermes implementation screen is ready."
echo "Attach with: tmux attach -t flash-arb7-hermes"
echo "Production prompt: docs/HERMES_PRODUCTION_AGENT_PROMPT.md"
echo "Execution remains externally authorized; no signing/broadcast is enabled by this launcher."
