import assert from "node:assert/strict";
import test from "node:test";
import { createPostExecutionAuditRecord } from "./post-execution-audit-record.js";
import { verifyPostExecutionAuditRecord } from "./post-execution-audit-verifier.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionAccounting } from "./post-execution-accounting.js";
import type { RepaymentEventLog } from "./repayment-event-verifier.js";
import type { TransactionIntentCorrelation } from "./transaction-intent-correlation.js";

const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n,
  blockTimestampMs: 1_000_000, lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan",
  simulationPassed: true, economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 10n,
  decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" }, gasCostUsd: 1,
  loanToken: "0x0000000000000000000000000000000000000001", loanAmount: 1000n, repaymentAmount: 1001n,
  executionAuthorization: 0 as const, liveSigning: false as const, broadcastEnabled: false as const,
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

const correlation = {
  observationId: record.observationId, planHash: record.planHash, chainId: 1,
  transactionHash: accounting.transactionHash,
  from: "0x0000000000000000000000000000000000000005",
  to: "0x0000000000000000000000000000000000000006",
  data: "0x1234", valueWei: 0n, receiptBlockNumber: 101n,
  repaymentAmount: 1001n, realizedProfitTokenUnits: 24n, minimumProfitTokenUnits: 10n,
  executionAuthorization: 0, liveSigning: false, broadcastEnabled: false, verified: true,
} as TransactionIntentCorrelation;

function makeAudit() {
  return createPostExecutionAuditRecord(record, accounting, repayment, correlation);
}

test("verifies an untampered deterministic audit record", () => {
  const audit = makeAudit();
  assert.equal(verifyPostExecutionAuditRecord(audit), true);
  assert.equal(verifyPostExecutionAuditRecord(audit), true);
});

test("rejects audit identity tampering", () => {
  const audit = makeAudit();
  assert.throws(() => verifyPostExecutionAuditRecord({ ...audit, realizedProfitTokenUnits: 25n }), /AUDIT_ID_MISMATCH/);
});

test("rejects transaction mismatch", () => {
  const audit = makeAudit();
  assert.throws(() => verifyPostExecutionAuditRecord({ ...audit, repaymentTransactionHash: "0x" + "c".repeat(64) }), /AUDIT_TRANSACTION_MISMATCH/);
});

test("rejects block mismatch", () => {
  const audit = makeAudit();
  assert.throws(() => verifyPostExecutionAuditRecord({ ...audit, repaymentBlockNumber: 102n }), /AUDIT_BLOCK_MISMATCH/);
});

test("rejects policy mutation", () => {
  const audit = makeAudit();
  assert.throws(() => verifyPostExecutionAuditRecord({ ...audit, liveSigning: true }), /AUDIT_POLICY_VIOLATION/);
});
