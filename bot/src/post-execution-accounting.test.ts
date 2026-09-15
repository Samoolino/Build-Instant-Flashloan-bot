import assert from "node:assert/strict";
import test from "node:test";
import { verifyPostExecutionAccounting } from "./post-execution-accounting.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionVerification } from "./post-execution-verifier.js";

const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n,
  blockTimestampMs: 1_000_000, lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan",
  simulationPassed: true, economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 10n,
  decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" }, gasCostUsd: 1,
  loanToken: "0x0000000000000000000000000000000000000001", loanAmount: 1000n, repaymentAmount: 1001n,
  executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as unknown as ExecutionLockRecord;

const receipt = {
  transactionHash: "0x" + "b".repeat(64), blockNumber: 101n, status: "SUCCESS", to: "0x0000000000000000000000000000000000000003",
  gasUsed: 21000n, effectiveGasPriceWei: 1000000000n, executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as PostExecutionVerification;

test("combines successful receipt and realized profit verification", () => {
  const result = verifyPostExecutionAccounting({ receipt, record, finalLoanAssetBalance: 1025n });
  assert.equal(result.verified, true);
  assert.equal(result.realizedProfit.realizedProfitTokenUnits, 24n);
});

test("rejects a receipt before the locked observation block", () => {
  assert.throws(() => verifyPostExecutionAccounting({ receipt: { ...receipt, blockNumber: 99n }, record, finalLoanAssetBalance: 1025n }), /RECEIPT_BLOCK_REGRESSED/);
});

test("rejects a failed receipt", () => {
  assert.throws(() => verifyPostExecutionAccounting({ receipt: { ...receipt, status: "FAILED" }, record, finalLoanAssetBalance: 1025n }), /TRANSACTION_NOT_SUCCESSFUL/);
});

test("rejects insufficient final balance", () => {
  assert.throws(() => verifyPostExecutionAccounting({ receipt, record, finalLoanAssetBalance: 1000n }), /REPAYMENT_NOT_COVERED/);
});
