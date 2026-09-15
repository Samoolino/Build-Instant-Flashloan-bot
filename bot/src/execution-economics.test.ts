import assert from "node:assert/strict";
import test from "node:test";
import { estimateExecutionEconomics } from "./execution-economics.js";

const from = "0x1111111111111111111111111111111111111111";
const to = "0x2222222222222222222222222222222222222222";

test("derives gas cost from eth_estimateGas and eth_gasPrice", async () => {
  const calls: string[] = [];
  const rpc = {
    async request<T>(method: string, _params: readonly unknown[] = []): Promise<T> {
      calls.push(method);
      if (method === "eth_estimateGas") return "0x5208" as T;
      if (method === "eth_gasPrice") return "0x3b9aca00" as T;
      throw new Error(`UNEXPECTED_RPC_METHOD:${method}`);
    },
  };
  const result = await estimateExecutionEconomics(rpc, { from, to }, 2_500);
  assert.equal(result.gasLimit, 21_000n);
  assert.equal(result.gasPriceWei, 1_000_000_000n);
  assert.equal(result.nativeCostWei, 21_000_000_000_000n);
  assert.equal(result.gasCostUsd, 0.0525);
  assert.deepEqual(calls.sort(), ["eth_estimateGas", "eth_gasPrice"]);
});

test("rejects invalid transaction addresses before RPC", async () => {
  let called = false;
  const rpc = { request: async <T>() => { called = true; return "0x1" as T; } };
  await assert.rejects(() => estimateExecutionEconomics(rpc, { from: "0x123", to }, 2_500), /INVALID_GAS_ESTIMATE_ADDRESS/);
  assert.equal(called, false);
});

test("rejects invalid gas quantities", async () => {
  const rpc = {
    request: async <T>(method: string): Promise<T> => method === "eth_estimateGas" ? "invalid" as T : "0x1" as T,
  };
  await assert.rejects(() => estimateExecutionEconomics(rpc, { from, to }, 2_500), /RPC_GAS_ESTIMATE_INVALID/);
});
