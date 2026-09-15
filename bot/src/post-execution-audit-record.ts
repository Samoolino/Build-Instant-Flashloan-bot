import { createHash } from "node:crypto";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionAccounting } from "./post-execution-accounting.js";
import type { RepaymentEventLog } from "./repayment-event-verifier.js";

export type PostExecutionAuditRecord = {
  auditId: string;
  observationId: string;
  chainId: number;
  transactionHash: string;
  receiptBlockNumber: bigint;
  planHash: string;
  loanToken: string;
  loanAmount: bigint;
  repaymentAmount: bigint;
  repaymentTransactionHash: string;
  repaymentBlockNumber: bigint;
  finalLoanAssetBalance: bigint;
  realizedProfitTokenUnits: bigint;
  minimumProfitTokenUnits: bigint;
  gasUsed: bigint;
  effectiveGasPriceWei: bigint;
  verified: true;
  executionAuthorization: 0;
  liveSigning: false;
  broadcastEnabled: false;
};

function canonical(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  }
  return value;
}

/** Creates a deterministic immutable audit record from already-verified post-execution evidence. */
export function createPostExecutionAuditRecord(
  record: ExecutionLockRecord,
  accounting: PostExecutionAccounting,
  repayment: RepaymentEventLog,
): PostExecutionAuditRecord {
  if (accounting.verified !== true) throw new Error("POST_EXECUTION_ACCOUNTING_REQUIRED");
  if (record.executionAuthorization !== 0 || record.liveSigning || record.broadcastEnabled) throw new Error("POST_EXECUTION_POLICY_VIOLATION");
  if (accounting.transactionHash.toLowerCase() !== repayment.transactionHash.toLowerCase()) throw new Error("AUDIT_TRANSACTION_MISMATCH");
  if (accounting.blockNumber !== repayment.blockNumber) throw new Error("AUDIT_BLOCK_MISMATCH");

  const payload = canonical({
    observationId: record.observationId,
    chainId: record.chainId,
    transactionHash: accounting.transactionHash,
    receiptBlockNumber: accounting.blockNumber,
    planHash: record.planHash,
    loanToken: record.loanToken,
    loanAmount: record.loanAmount,
    repaymentAmount: record.repaymentAmount,
    repaymentTransactionHash: repayment.transactionHash,
    repaymentBlockNumber: repayment.blockNumber,
    finalLoanAssetBalance: accounting.realizedProfit.finalAssetBalance,
    realizedProfitTokenUnits: accounting.realizedProfit.realizedProfitTokenUnits,
    minimumProfitTokenUnits: accounting.realizedProfit.minimumProfitTokenUnits,
    gasUsed: accounting.gasUsed,
    effectiveGasPriceWei: accounting.effectiveGasPriceWei,
    verified: true,
  });
  const auditId = `sha256:${createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex")}`;

  return Object.freeze({
    auditId,
    observationId: record.observationId,
    chainId: record.chainId,
    transactionHash: accounting.transactionHash,
    receiptBlockNumber: accounting.blockNumber,
    planHash: record.planHash,
    loanToken: record.loanToken,
    loanAmount: record.loanAmount,
    repaymentAmount: record.repaymentAmount,
    repaymentTransactionHash: repayment.transactionHash,
    repaymentBlockNumber: repayment.blockNumber,
    finalLoanAssetBalance: accounting.realizedProfit.finalAssetBalance,
    realizedProfitTokenUnits: accounting.realizedProfit.realizedProfitTokenUnits,
    minimumProfitTokenUnits: accounting.realizedProfit.minimumProfitTokenUnits,
    gasUsed: accounting.gasUsed,
    effectiveGasPriceWei: accounting.effectiveGasPriceWei,
    verified: true,
    executionAuthorization: 0,
    liveSigning: false,
    broadcastEnabled: false,
  });
}
