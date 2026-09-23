#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source scripts/alchemy-rpc-env.sh
exec npm --prefix dapp-dashboard run dev