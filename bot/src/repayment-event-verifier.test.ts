import assert from "node:assert/strict";
import test from "node:test";
import { verifyAaveRepaymentTransfer } from "./repayment-event-verifier.js";
import type { ExecutionLockRecord } from "./engagement-record.js";

const executor = "0x0000000000000000000000000000000000000002";
const lender = "0x0000000000000000000000000000000000000003";
const token = "0x0000000000000000000000000000000000000001";
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a8df523b3ef";
const pad = (value: string) => `0x${value.slice(2).padStart(64, "0")}`;
const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n,
  blockTimestampMs: 1_000_000, lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan",
  simulationPassed: true, economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 10n,
  decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" }, gasCostUsd: 1, loanToken: token,
  loanAmount: 1000n, repaymentAmount: 1001n, executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as unknown as ExecutionLockRecord;

function repaymentLog(amount = 1001n) {
  return { address: token, topics: [transferTopic, pad(executor), pad(lender)], data: `0x${amount.toString(16).padStart(64, "0")}`, logIndex: "0x2" };
}

test("verifies exact repayment transfer from executor to lender", () => {
  const result = verifyAaveRepaymentTransfer(record, lender, executor, "0x" + "b".repeat(64), 101n, [repaymentLog()]);
  assert.equal(result.repaymentAmount, 1001n);
  assert.equal(result.verified, true);
});

test("rejects a different transfer sender", () => {
  assert.throws(() => verifyAaveRepaymentTransfer(record, lender, "0x0000000000000000000000000000000000000004", "0x" + "b".repeat(64), 101n, [repaymentLog()]), /REPAYMENT_TRANSFER_NOT_FOUND/);
});

test("rejects an incorrect repayment amount", () => {
  assert.throws(() => verifyAaveRepaymentTransfer(record, lender, executor, "0x" + "b".repeat(64), 101n, [repaymentLog(1000n)]), /REPAYMENT_TRANSFER_NOT_FOUND/);
});

test("rejects a repayment before the observation block", () => {
  assert.throws(() => verifyAaveRepaymentTransfer(record, lender, executor, "0x" + "b".repeat(64), 99n, [repaymentLog()]), /REPAYMENT_BLOCK_REGRESSED/);
});
