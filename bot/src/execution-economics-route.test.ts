import test from "node:test";
import assert from "node:assert/strict";
import { applyExecutionEconomics, planRouteWithExecutionEconomics, type ExecutableRouteContext } from "./execution-economics.js";
import type { RpcTransport } from "./rpc-client.js";
import type { RouteCandidate } from "./route-planner.js";

const candidate: RouteCandidate = {
  chainId: 1,
  loanToken: "0x0000000000000000000000000000000000000001",
  loanAmount: 1_000_000n,
  tokenUsdPrice: 2500,
  tokenDecimals: 6,
  lenderPremiumUsd: 0,
  gasCostUsd: 999,
  swapFeesUsd: 0,
  slippageUsd: 0,
  finalAmount: 1_010_000n,
  repaymentAmount: 1_000_000n,
  planHash: "0xplan",
  simulationPassed: true,
  economicInputsVerified: true,
  legs: [{
    chainId: 1,
    tokenIn: "0x0000000000000000000000000000000000000001",
    tokenOut: "0x0000000000000000000000000000000000000002",
    amountIn: 1_000_000n,
    minimumAmountOut: 1n,
    quoteSource: "test",
  }],
};

function mockRpc(): RpcTransport {
  return {
    async request<T>(method: string): Promise<T> {
      if (method === "eth_estimateGas") return "0x5208" as T;
      if (method === "eth_gasPrice") return "0x3b9aca00" as T;
      throw new Error(`UNEXPECTED_RPC:${method}`);
    },
  };
}

const route: ExecutableRouteContext = {
  kind: "ROUTE_EXECUTION",
  from: "0x0000000000000000000000000000000000000002",
  to: "0x0000000000000000000000000000000000000003",
  data: "0x1234",
};

test("applies gas economics from complete route calldata", async () => {
  const updated = await applyExecutionEconomics(candidate, mockRpc(), route, 2500);
  assert.equal(updated.gasCostUsd, 0.0525);
  assert.equal(updated.gasCostUsd < candidate.gasCostUsd, true);
});

test("requires a valid native-token USD price before RPC", async () => {
  await assert.rejects(
    applyExecutionEconomics(candidate, mockRpc(), route, 0),
    /INVALID_NATIVE_USD_PRICE/,
  );
});

test("passes exact route calldata to eth_estimateGas", async () => {
  let observed: readonly unknown[] | undefined;
  const rpc: RpcTransport = {
    async request<T>(method: string, params: readonly unknown[]): Promise<T> {
      if (method === "eth_estimateGas") {
        observed = params;
        return "0x5208" as T;
      }
      if (method === "eth_gasPrice") return "0x3b9aca00" as T;
      throw new Error(`UNEXPECTED_RPC:${method}`);
    },
  };
  await applyExecutionEconomics(candidate, rpc, route, 2500);
  assert.deepEqual(observed, [[{ from: route.from, to: route.to, data: route.data }]]);
});

test("feeds complete-route gas cost into the profitability planner", async () => {
  const planned = await planRouteWithExecutionEconomics(candidate, mockRpc(), route, 2500);
  assert.equal(planned.candidate.gasCostUsd, 0.0525);
  assert.equal(planned.netProfitUsd, 24.9475);
  assert.equal(planned.decision.eligible, true);
});

test("does not let gas estimation claim verification when other economics are unverified", async () => {
  const updated = await applyExecutionEconomics({ ...candidate, economicInputsVerified: false }, mockRpc(), route, 2500);
  assert.equal(updated.economicInputsVerified, false);
  await assert.rejects(
    planRouteWithExecutionEconomics({ ...candidate, economicInputsVerified: false }, mockRpc(), route, 2500),
    /VERIFIED_ECONOMICS_REQUIRED/,
  );
});
