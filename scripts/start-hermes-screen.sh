#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="${HERMES_TMUX_SESSION:-flash-arb7-hermes}"
LOG_DIR="${ROOT}/state/hermes"
mkdir -p "$LOG_DIR"

command -v tmux >/dev/null 2>&1 || {
  echo "tmux is required: sudo apt-get install -y tmux"
  exit 1
}

tmux has-session -t "$SESSION" 2>/dev/null && {
  echo "Hermes screen already running: $SESSION"
  echo "Attach with: tmux attach -t $SESSION"
  exit 0
}

tmux new-session -d -s "$SESSION" -n control "cd '$ROOT' && exec bash"
tmux new-window -t "$SESSION" -n rpc "cd '$ROOT' && source scripts/alchemy-rpc-env.sh && node bot/src/hermes-rpc-bridge.mjs 2>&1 | tee -a '$LOG_DIR/rpc-live.log'"
tmux new-window -t "$SESSION" -n mcp "cd '$ROOT' && npm --prefix bot run hermes:mcp 2>&1 | tee -a '$LOG_DIR/mcp.log'"
tmux new-window -t "$SESSION" -n agent "cd '$ROOT' && echo 'Hermes agentic board: observation -> strategy -> simulation -> unsigned intent' && echo 'LIVE SIGNING: OFF | BROADCAST: OFF | AUTHORIZATION: 0' && exec bash"
tmux new-window -t "$SESSION" -n tests "cd '$ROOT' && npm --prefix bot test 2>&1 | tee -a '$LOG_DIR/tests.log'; exec bash"

tmux select-window -t "$SESSION:control"
echo
echo "Hermes bot screen started: $SESSION"
echo "Attach: tmux attach -t $SESSION"
echo "Windows: control | rpc | mcp | agent | tests"
echo "Safety boundary: signing=OFF broadcast=OFF authorization=0"
