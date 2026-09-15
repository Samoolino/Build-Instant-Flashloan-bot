import assert from "node:assert/strict";
import test from "node:test";
import { collectPostExecutionEvidence } from "./post-execution-evidence.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { RpcTransport } from "./rpc-client.js";

const token = "0x0000000000000000000000000000000000000001";
const lender = "0x0000000000000000000000000000000000000002";
const executor = "0x0000000000000000000000000000000000000003";
const target = "0x0000000000000000000000000000000000000004";
const tx = "0x" + "a".repeat(64);
const blockHash = "0x" + "b".repeat(64);
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a8df523b3ef";
const word = (address: string) => "0x" + "0".repeat(24) + address.slice(2);
const amountWord = (amount: bigint) => "0x" + amount.toString(16).padStart(64, "0");

const record = {
  observationId: "sha256:" + "c".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n,
  blockTimestampMs: 1_000_000, lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan",
  simulationPassed: true, economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 10n,
  decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" }, gasCostUsd: 1, loanToken: token,
  loanAmount: 1000n, repaymentAmount: 1001n, executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as unknown as ExecutionLockRecord;

const rpc: RpcTransport = {
  async request<T>(method: string): Promise<T> {
    assert.equal(method, "eth_getTransactionReceipt");
    return {
      transactionHash: tx, blockHash, blockNumber: "0x65", status: "0x1", from: executor, to: target,
      gasUsed: "0x5208", effectiveGasPrice: "0x3b9aca00",
    } as T;
  },
};

const logs = [{ address: token, topics: [transferTopic, word(executor), word(lender)], data: amountWord(1001n) }];

test("collects receipt, exact repayment event, and realized profit", async () => {
  const evidence = await collectPostExecutionEvidence(rpc, record, tx, target, lender, executor, logs, 1025n);
  assert.equal(evidence.verified, true);
  assert.equal(evidence.repayment.repaymentAmount, 1001n);
  assert.equal(evidence.realizedProfit.realizedProfitTokenUnits, 24n);
});

test("rejects repayment evidence from another transaction", async () => {
  const badLogs = [{ ...logs[0], data: amountWord(1001n) }];
  await assert.rejects(() => collectPostExecutionEvidence(rpc, record, "0x" + "d".repeat(64), target, lender, executor, badLogs, 1025n), /REPAYMENT_TRANSFER_NOT_FOUND|RECEIPT_HASH_MISMATCH/);
});
