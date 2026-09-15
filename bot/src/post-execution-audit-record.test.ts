import assert from "node:assert/strict";
import test from "node:test";
import { createPostExecutionAuditRecord } from "./post-execution-audit-record.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionAccounting } from "./post-execution-accounting.js";
import type { RepaymentEventLog } from "./repayment-event-verifier.js";

const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n,
  blockTimestampMs: 1_000_000, lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan",
  simulationPassed: true, economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 10n,
  decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" }, gasCostUsd: 1,
  loanToken: "0x0000000000000000000000000000000000000001", loanAmount: 1000n, repaymentAmount: 1001n,
  executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as unknown as ExecutionLockRecord;

const accounting = {
  transactionHash: "0x" + "b".repeat(64), blockNumber: 101n, gasUsed: 21000n, effectiveGasPriceWei: 1000000000n,
  realizedProfit: { loanToken: record.loanToken, finalAssetBalance: 1025n, repaymentAmount: 1001n, realizedProfitTokenUnits: 24n, minimumProfitTokenUnits: 10n, profitable: true },
  verified: true,
} as PostExecutionAccounting;

const repayment = {
  lenderAddress: "0x0000000000000000000000000000000000000004", loanToken: record.loanToken,
  executorAddress: "0x0000000000000000000000000000000000000003", repaymentAmount: 1001n,
  transactionHash: accounting.transactionHash, blockNumber: 101n, verified: true,
} as unknown as RepaymentEventLog;

test("creates deterministic immutable audit record", () => {
  const first = createPostExecutionAuditRecord(record, accounting, repayment);
  const second = createPostExecutionAuditRecord(record, accounting, repayment);
  assert.equal(first.auditId, second.auditId);
  assert.match(first.auditId, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.realizedProfitTokenUnits, 24n);
  assert.equal(first.verified, true);
});

test("rejects mismatched repayment transaction", () => {
  assert.throws(() => createPostExecutionAuditRecord(record, accounting, { ...repayment, transactionHash: "0x" + "c".repeat(64) }), /AUDIT_TRANSACTION_MISMATCH/);
});

test("rejects mismatched repayment block", () => {
  assert.throws(() => createPostExecutionAuditRecord(record, accounting, { ...repayment, blockNumber: 102n }), /AUDIT_BLOCK_MISMATCH/);
});
