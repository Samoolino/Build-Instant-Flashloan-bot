import assert from "node:assert/strict";
import test from "node:test";
import { observeAaveEngagement } from "./engagement-observation.js";
import type { RpcTransport } from "./rpc-client.js";

const candidate = {
  chainId: 1,
  loanToken: "0x0000000000000000000000000000000000000001",
  loanAmount: 1_000_000_000_000_000_000n,
  tokenUsdPrice: 2500,
  tokenDecimals: 18,
  lenderPremiumUsd: 0,
  gasCostUsd: 0,
  swapFeesUsd: 0.1,
  slippageUsd: 0.1,
  finalAmount: 1_010_000_000_000_000_000n,
  repaymentAmount: 1_000_900_000_000_000_000n,
  planHash: "0xplan",
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

function rpc(): RpcTransport {
  return {
    request: async <T>(method: string) => {
      if (method === "eth_blockNumber") return "0x64" as T;
      if (method === "eth_getBlockByNumber") return { timestamp: "0x68c0a000" } as T;
      if (method === "eth_call") return "0x384" as T;
      if (method === "eth_estimateGas") return "0xc350" as T;
      if (method === "eth_gasPrice") return "0x3e8" as T;
      throw new Error(`UNEXPECTED_RPC:${method}`);
    },
  };
}

test("pins lender economics to the observed chain block and plans without signing", async () => {
  const result = await observeAaveEngagement(
    candidate,
    rpc(),
    {
      kind: "ROUTE_EXECUTION",
      from: "0x0000000000000000000000000000000000000003",
      to: "0x0000000000000000000000000000000000000004",
    },
    2500,
    "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
  );

  assert.equal(result.blockNumber, 100n);
  assert.equal(result.lenderPremiumBlockNumber, 100n);
  assert.equal(result.planned.candidate.economicInputsVerified, true);
  assert.equal(result.planned.decision.eligible, true);
});

test("rejects a quote pinned to a different block", async () => {
  const quote = {
    amountOut: 1_000n,
    gasCostUsd: 0,
    lenderPremiumUsd: 0,
    swapFeeUsd: 0,
    slippageUsd: 0,
    source: "test",
    sourceId: "test",
    quotedAtMs: Date.now(),
    expiresAtMs: Date.now() + 10000,
    blockNumber: 99n,
  };

  await assert.rejects(
    () => observeAaveEngagement(candidate, rpc(), {
      kind: "ROUTE_EXECUTION",
      from: "0x0000000000000000000000000000000000000003",
      to: "0x0000000000000000000000000000000000000004",
    }, 2500, "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", quote),
    /QUOTE_BLOCK_MISMATCH/,
  );
});
