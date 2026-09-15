import assert from "node:assert/strict";
import test from "node:test";
import { readChainState } from "./rpc-state.js";

const rpc = {
  async request<T>(method: string, _params: readonly unknown[] = []): Promise<T> {
    if (method === "eth_blockNumber") return "0x10" as T;
    if (method === "eth_getBlockByNumber") return { timestamp: "0x65" } as T;
    throw new Error(`UNEXPECTED_METHOD:${method}`);
  },
};

test("reads chain state using the canonical network registry", async () => {
  const state = await readChainState(1, {}, rpc);
  assert.equal(state.network.name, "Ethereum");
  assert.equal(state.blockNumber, 16n);
  assert.equal(state.blockTimestampMs, 101000);
});

test("rejects an unsupported canonical network", async () => {
  await assert.rejects(() => readChainState(999999, {}, rpc), /UNSUPPORTED_CANONICAL_CHAIN/);
});

test("requires a block timestamp", async () => {
  const missingTimestampRpc = {
    async request<T>(method: string, _params: readonly unknown[] = []): Promise<T> {
      if (method === "eth_blockNumber") return "0x10" as T;
      return {} as T;
    },
  };
  await assert.rejects(() => readChainState(1, {}, missingTimestampRpc), /RPC_BLOCK_TIMESTAMP_MISSING/);
});
