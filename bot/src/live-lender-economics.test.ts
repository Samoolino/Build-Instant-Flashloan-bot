import assert from "node:assert/strict";
import test from "node:test";
import { applyLiveAaveV3LenderEconomics } from "./live-lender-economics.js";
import type { RpcTransport } from "./rpc-client.js";
import type { RouteCandidate } from "./route-planner.js";

const candidate: RouteCandidate = {
  chainId: 1,
  loanToken: "0x0000000000000000000000000000000000000001",
  loanAmount: 1_000_000_000_000_000_000n,
  tokenUsdPrice: 2500,
  tokenDecimals: 18,
  lenderPremiumUsd: 0,
  gasCostUsd: 0.75,
  swapFeesUsd: 0.1,
  slippageUsd: 0.05,
  finalAmount: 1_002_000_000_000_000_000n,
  repaymentAmount: 1_000_000_000_000_000_000n,
  planHash: "0xabc",
  simulationPassed: true,
  economicInputsVerified: false,
  legs: [{
    chainId: 1,
    tokenIn: "0x0000000000000000000000000000000000000001",
    tokenOut: "0x0000000000000000000000000000000000000002",
    amountIn: 1_000_000_000_000_000_000n,
    minimumAmountOut: 1n,
    quoteSource: "test",
  }],
};

const pool = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

test("applies the live Aave premium to route economics", async () => {
  const rpc: RpcTransport = { request: async <T>() => "0x384" as T };
  const result = await applyLiveAaveV3LenderEconomics(candidate, rpc, pool, 123n);
  assert.equal(result.economics.premiumBps, 900n);
  assert.equal(result.economics.premiumTokenUnits, 9_000_000_000_000_000n);
  assert.equal(result.economics.premiumUsd, 22.5);
  assert.equal(result.candidate.lenderPremiumUsd, 22.5);
  assert.equal(result.candidate.economicInputsVerified, true);
});

test("rounds lender premium token units upward", async () => {
  const rpc: RpcTransport = { request: async <T>() => "0x1" as T };
  const result = await applyLiveAaveV3LenderEconomics({ ...candidate, loanAmount: 1n, tokenDecimals: 0 }, rpc, pool, 1n);
  assert.equal(result.economics.premiumTokenUnits, 1n);
});
