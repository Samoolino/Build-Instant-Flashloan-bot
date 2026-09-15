import assert from "node:assert/strict";
import test from "node:test";
import { collectPostExecutionEvidenceFromRpc } from "./post-execution-rpc-evidence.js";
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

function makeRpc(finalBalance: bigint): RpcTransport {
  let receiptReads = 0;
  return {
    async request<T>(method: string, params: readonly unknown[]): Promise<T> {
      if (method === "eth_chainId") return "0x1" as T;
      if (method === "eth_getTransactionReceipt") {
        receiptReads += 1;
        return {
          transactionHash: tx, blockHash, blockNumber: "0x65", status: "0x1", from: executor, to: target,
          gasUsed: "0x5208", effectiveGasPrice: "0x3b9aca00",
          ...(receiptReads > 1 ? {
            logs: [{ address: token, topics: [transferTopic, word(executor), word(lender)], data: amountWord(1001n), logIndex: "0x0" }],
          } : {}),
        } as T;
      }
      if (method === "eth_call") {
        assert.equal(params[1], "0x65");
        return (`0x${finalBalance.toString(16).padStart(64, "0")}`) as T;
      }
      throw new Error(`UNEXPECTED_RPC_METHOD:${method}`);
    },
  };
}

test("collects receipt logs and final balance from the receipt block", async () => {
  const evidence = await collectPostExecutionEvidenceFromRpc(makeRpc(1025n), record, tx, target, lender, executor);
  assert.equal(evidence.verified, true);
  assert.equal(evidence.repayment.repaymentAmount, 1001n);
  assert.equal(evidence.realizedProfit.realizedProfitTokenUnits, 24n);
});

test("rejects an RPC final balance below repayment", async () => {
  await assert.rejects(
    () => collectPostExecutionEvidenceFromRpc(makeRpc(1000n), record, tx, target, lender, executor),
    /FINAL_BALANCE_BELOW_REPAYMENT/,
  );
});
