import assert from "node:assert/strict";
import test from "node:test";
import { planRoute, type RouteCandidate } from "./route-planner.js";

const baseCandidate: RouteCandidate = {
  chainId: 1,
  loanToken: "0x0000000000000000000000000000000000000001",
  loanAmount: 1_000_000_000_000_000_000n,
  tokenUsdPrice: 2500,
  tokenDecimals: 18,
  lenderPremiumUsd: 0.25,
  gasCostUsd: 0.75,
  swapFeesUsd: 0.10,
  slippageUsd: 0.05,
  finalAmount: 1_002_000_000_000_000_000n,
  repaymentAmount: 1_000_000_000_000_000_000n,
  planHash: "0xabc",
  simulationPassed: true,
  legs: [{
    chainId: 1,
    tokenIn: "0x0000000000000000000000000000000000000001",
    tokenOut: "0x0000000000000000000000000000000000000002",
    amountIn: 1_000_000_000_000_000_000n,
    minimumAmountOut: 1n,
    quoteSource: "test",
  }],
};

test("accepts a simulated route above the $2 hard floor", () => {
  const planned = planRoute(baseCandidate);
  assert.equal(planned.network.chainId, 1);
  assert.equal(planned.decision.eligible, true);
  assert.equal(planned.decision.reason, "ABOVE_HARD_FLOOR");
  assert.equal(planned.minimumProfitTokenUnits, 800_000_000_000_000n);
});

test("enforces a caller-supplied minimum profit policy", () => {
  const belowPolicy = planRoute(baseCandidate, { minimumNetProfitUsd: 4 });
  assert.equal(belowPolicy.decision.eligible, false);
  assert.equal(belowPolicy.decision.reason, "BELOW_HARD_FLOOR");
  const planned = planRoute(baseCandidate, { minimumNetProfitUsd: 1 });
  assert.equal(planned.decision.eligible, true);
  assert.equal(planned.minimumProfitTokenUnits, 400_000_000_000_000n);
});

test("rejects an unsimulated route before profitability", () => {
  assert.throws(() => planRoute({ ...baseCandidate, simulationPassed: false }), /SIMULATION_REQUIRED/);
});

test("rejects a route that cannot repay the lender", () => {
  assert.throws(() => planRoute({ ...baseCandidate, repaymentAmount: baseCandidate.loanAmount + 1n, finalAmount: baseCandidate.loanAmount }), /INSUFFICIENT_FINAL_BALANCE/);
});

test("rejects unsupported canonical chains", () => {
  assert.throws(() => planRoute({ ...baseCandidate, chainId: 999999 }), /UNSUPPORTED_CANONICAL_CHAIN/);
});

test("preserves token-unit precision for large base-unit balances", () => {
  const planned = planRoute({
    ...baseCandidate,
    loanAmount: 1_000_000_000_000_000_000_000_000_000_000n,
    finalAmount: 1_000_000_000_000_000_000_000_001_180_000_000_000_000n,
  });
  assert.equal(planned.netProfitUsd, 1.8);
});
