import assert from "node:assert/strict";
import test from "node:test";
import { createObservationIdentity } from "./observation-identity.js";

const base = {
  planned: {
    network: { name: "Ethereum", chainId: 1, nativeSymbol: "ETH", rpcEnvVar: "ETH_RPC_URL" },
    candidate: {
      chainId: 1,
      loanToken: "0x0000000000000000000000000000000000000001",
      loanAmount: 1000n,
      tokenUsdPrice: 2500,
      tokenDecimals: 18,
      lenderPremiumUsd: 0.09,
      gasCostUsd: 0.05,
      swapFeesUsd: 0.1,
      slippageUsd: 0.02,
      finalAmount: 1001n,
      repaymentAmount: 1001n,
      planHash: "0xplan",
      simulationPassed: true,
      economicInputsVerified: true,
      legs: [{ chainId: 1, tokenIn: "0x0000000000000000000000000000000000000001", tokenOut: "0x0000000000000000000000000000000000000002", amountIn: 1000n, minimumAmountOut: 1n, quoteSource: "test" }],
    },
    netProfitUsd: 2.24,
    minimumProfitTokenUnits: 800000000000000n,
    decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" },
  },
  blockNumber: 100n,
  blockTimestampMs: 1000000,
  quoteBlockNumber: 100n,
  lenderPremiumBlockNumber: 100n,
  quoteSourceId: "quote:test",
  lenderSourceId: "aave:test",
};

test("creates deterministic observation identity", () => {
  const first = createObservationIdentity(base);
  const second = createObservationIdentity(structuredClone(base));
  assert.match(first.observationId, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.observationId, second.observationId);
});

test("changes identity when the observed economics change", () => {
  const first = createObservationIdentity(base);
  const changed = createObservationIdentity({
    ...base,
    planned: { ...base.planned, netProfitUsd: 2.25 },
  });
  assert.notEqual(first.observationId, changed.observationId);
});

test("canonical payload serializes bigint values safely", () => {
  const identity = createObservationIdentity(base);
  assert.match(identity.canonicalPayload, /"blockNumber":"100"/);
  assert.match(identity.canonicalPayload, /"loanAmount":"1000"/);
});
