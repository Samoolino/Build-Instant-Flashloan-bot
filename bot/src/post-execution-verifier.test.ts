import assert from "node:assert/strict";
import test from "node:test";
import { verifyPostExecutionReceipt } from "./post-execution-verifier.js";
import type { RpcTransport } from "./rpc-client.js";
import type { ExecutionLockRecord } from "./engagement-record.js";

const record = {
  executionAuthorization: 0,
  liveSigning: false,
  broadcastEnabled: false,
} as ExecutionLockRecord;
const hash = "0x" + "a".repeat(64);
const blockHash = "0x" + "b".repeat(64);
const to = "0x0000000000000000000000000000000000000002";
const receipt = {
  transactionHash: hash,
  blockHash,
  blockNumber: "0x64",
  status: "0x1",
  from: "0x0000000000000000000000000000000000000001",
  to,
  gasUsed: "0x5208",
  effectiveGasPrice: "0x3b9aca00",
};

function rpcWith(value: unknown): RpcTransport {
  return { async request<T>(): Promise<T> { return value as T; } };
}

test("verifies a successful externally broadcast receipt without signing", async () => {
  const result = await verifyPostExecutionReceipt(rpcWith(receipt), record, hash, to);
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.blockNumber, 100n);
  assert.equal(result.gasUsed, 21000n);
  assert.equal(result.effectiveGasPriceWei, 1_000_000_000n);
  assert.equal(result.executionAuthorization, 0);
});

test("rejects a missing receipt", async () => {
  await assert.rejects(() => verifyPostExecutionReceipt(rpcWith(null), record, hash, to), /TRANSACTION_RECEIPT_NOT_FOUND/);
});

test("rejects a reverted transaction", async () => {
  await assert.rejects(() => verifyPostExecutionReceipt(rpcWith({ ...receipt, status: "0x0" }), record, hash, to), /TRANSACTION_FAILED/);
});

test("rejects a recipient mismatch", async () => {
  await assert.rejects(() => verifyPostExecutionReceipt(rpcWith({ ...receipt, to: "0x0000000000000000000000000000000000000003" }), record, hash, to), /RECEIPT_RECIPIENT_MISMATCH/);
});
