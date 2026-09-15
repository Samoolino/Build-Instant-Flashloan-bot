import assert from "node:assert/strict";
import test from "node:test";
import { identifyEngagement } from "./engagement-identity.js";

const observation = {
  planned: {
    network: { name: "Ethereum", chainId: 1, nativeSymbol: "ETH", rpcEnvVar: "ETH_RPC_URL" },
    candidate: {
      chainId: 1,
      loanToken: "0x0000000000000000000000000000000000000001",
      loanAmount: 1_000n,
      tokenUsdPrice: 2500,
      tokenDecimals: 18,
      lenderPremiumUsd: 0.09,
      gasCostUsd: 0.05,
      swapFeesUsd: 0,
      slippageUsd: 0,
      finalAmount: 1_001n,
      repaymentAmount: 1_000n,
      planHash: "0xplan",
      simulationPassed: true,
      economicInputsVerified: true,
      legs: [{
        chainId: 1,
        tokenIn: "0x0000000000000000000000000000000000000001",
        tokenOut: "0x0000000000000000000000000000000000000002",
        amountIn: 1_000n,
        minimumAmountOut: 1n,
        quoteSource: "test",
      }],
    },
    netProfitUsd: 2.36,
    minimumProfitTokenUnits: 800_000_000_000_000n,
    decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" },
  },
  blockNumber: 100n,
  blockTimestampMs: 1_700_000_000_000,
  quoteBlockNumber: 100n,
  lenderPremiumBlockNumber: 100n,
  quoteSourceId: "quote:test",
  lenderSourceId: "aave-v3:flashloan-premium",
};

test("creates a deterministic observation identity", () => {
  const first = identifyEngagement(observation);
  const second = identifyEngagement(observation);
  assert.equal(first.observationId, second.observationId);
  assert.equal(first.blockNumber, 100n);
  assert.equal(first.lenderPremiumBlockNumber, 100n);
});

test("changes identity when the observed block changes", () => {
  const first = identifyEngagement(observation);
  const changed = identifyEngagement({ ...observation, blockNumber: 101n });
  assert.notEqual(first.observationId, changed.observationId);
});
