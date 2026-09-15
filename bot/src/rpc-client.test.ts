import assert from "node:assert/strict";
import test from "node:test";
import { createJsonRpcTransport, getLatestBlockNumber, type RpcTransport } from "./rpc-client.js";

test("RPC transport requires an environment-backed endpoint", () => {
  assert.throws(() => createJsonRpcTransport({ sourceId: "ethereum-rpc", rpcEnvVar: "ETH_RPC_URL" }, {}), /RPC_ENDPOINT_REQUIRED:ETH_RPC_URL/);
});

test("latest block number is parsed as bigint", async () => {
  const rpc: RpcTransport = { request: async () => "0x10" };
  assert.equal(await getLatestBlockNumber(rpc), 16n);
});

test("invalid block responses are rejected", async () => {
  const rpc: RpcTransport = { request: async () => "latest" };
  await assert.rejects(() => getLatestBlockNumber(rpc), /RPC_BLOCK_NUMBER_INVALID/);
});
