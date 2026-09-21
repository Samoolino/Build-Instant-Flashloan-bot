#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

: "${ETH_RPC_URL:?Set ETH_RPC_URL before running Ethereum fork verification}"

LOG_DIR="${ETH_FORK_VERIFY_LOG_DIR:-$HOME/Desktop/build-instant-flashloan-ethereum-fork}"
mkdir -p "$LOG_DIR"

echo "================================================"
echo "ETHEREUM AAVE V3 FORK VERIFICATION"
echo "================================================"
echo "RPC_SOURCE=ETH_RPC_URL"
echo "FORK_MODE=FOUNDry_CREATE_SELECT_FORK"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "================================================"

# Validate the upstream endpoint without exposing it.
RPC_URL="$ETH_RPC_URL" EXPECTED_CHAIN_ID=1 node scripts/rpc-smoke.mjs | tee "$LOG_DIR/rpc-smoke.txt"

# Preserve the locked execution boundary before running any fork test.
node scripts/verify-locked-state.mjs | tee "$LOG_DIR/locked-state.txt"

# These are simulation-only Foundry tests. They create an Ethereum fork,
# invoke the real Aave V3 pool at its deployed mainnet address, and use a
# deterministic swap venue for the two-leg executor path.
(
  cd contracts
  forge test --match-contract AaveFlashLoanCallbackForkTest \
    --match-test testEthereumForkAaveFlashLoanCallback -vv
) 2>&1 | tee "$LOG_DIR/aave-callback.txt"

(
  cd contracts
  forge test --match-contract AaveFlashArbExecutorForkTest \
    --match-test testEthereumForkTwoLegAtomicExecutor -vv
) 2>&1 | tee "$LOG_DIR/two-leg-executor.txt"

echo "================================================"
echo "ETHEREUM_AAVE_FORK_VERIFICATION=true"
echo "FORK_SIMULATION_ONLY=true"
echo "SIGNING=false"
echo "BROADCAST=false"
echo "LOG_DIR=$LOG_DIR"
echo "================================================"
