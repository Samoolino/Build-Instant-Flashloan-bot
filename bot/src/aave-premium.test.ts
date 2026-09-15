import assert from "node:assert/strict";
import test from "node:test";
import { readAaveV3FlashLoanPremium } from "./aave-premium.js";
import type { RpcTransport } from "./rpc-client.js";

const pool = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

test("reads the live Aave V3 premium at a pinned block", async () => {
  const calls: Array<{ method: string; params: readonly unknown[] }> = [];
  const rpc: RpcTransport = {
    request: async <T>(method: string, params: readonly unknown[]) => {
      calls.push({ method, params });
      return "0x384" as T;
    },
  };

  const result = await readAaveV3FlashLoanPremium(rpc, pool, 123n);
  assert.equal(result.premiumBps, 900n);
  assert.equal(result.premiumRate, 0.09);
  assert.equal(result.blockNumber, 123n);
  assert.equal(calls[0]?.method, "eth_call");
  assert.deepEqual(calls[0]?.params, [{ to: pool, data: "0x074b2e43" }, "0x7b"]);
});

test("rejects malformed Aave premium responses", async () => {
  const rpc: RpcTransport = { request: async <T>() => "0x" as T };
  await assert.rejects(() => readAaveV3FlashLoanPremium(rpc, pool, 1n), /AAVE_PREMIUM_RESULT_INVALID/);
});

test("rejects invalid pool and block inputs", async () => {
  const rpc: RpcTransport = { request: async <T>() => "0x384" as T };
  await assert.rejects(() => readAaveV3FlashLoanPremium(rpc, "0x0", 1n), /INVALID_AAVE_POOL_ADDRESS/);
  await assert.rejects(() => readAaveV3FlashLoanPremium(rpc, pool, -1n), /INVALID_AAVE_PREMIUM_BLOCK/);
});

test("rejects impossible premium values", async () => {
  const rpc: RpcTransport = { request: async <T>() => "0x2711" as T };
  await assert.rejects(() => readAaveV3FlashLoanPremium(rpc, pool, 1n), /AAVE_PREMIUM_OUT_OF_RANGE/);
});
