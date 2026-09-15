import { createHash } from "node:crypto";
import type { PostExecutionAuditRecord } from "./post-execution-audit-record.js";

function canonical(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value;
}

function address(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(error);
}

function hash(value: string, error: string): void {
  if (!/^sha256:[0-9a-fA-F]{64}$/.test(value)) throw new Error(error);
}

function transactionHash(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(error);
}

function data(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]*$/.test(value)) throw new Error(error);
}

function auditPayload(audit: PostExecutionAuditRecord): unknown {
  return canonical({
    observationId: audit.observationId,
    chainId: audit.chainId,
    transactionHash: audit.transactionHash,
    signerAddress: audit.signerAddress,
    transactionTo: audit.transactionTo,
    transactionData: audit.transactionData,
    transactionValueWei: audit.transactionValueWei,
    receiptBlockNumber: audit.receiptBlockNumber,
    planHash: audit.planHash,
    loanToken: audit.loanToken,
    loanAmount: audit.loanAmount,
    repaymentAmount: audit.repaymentAmount,
    repaymentTransactionHash: audit.repaymentTransactionHash,
    repaymentBlockNumber: audit.repaymentBlockNumber,
    finalLoanAssetBalance: audit.finalLoanAssetBalance,
    realizedProfitTokenUnits: audit.realizedProfitTokenUnits,
    minimumProfitTokenUnits: audit.minimumProfitTokenUnits,
    gasUsed: audit.gasUsed,
    effectiveGasPriceWei: audit.effectiveGasPriceWei,
    verified: true,
  });
}

/** Recomputes and verifies the immutable audit identity without changing or executing anything. */
export function verifyPostExecutionAuditRecord(audit: PostExecutionAuditRecord): true {
  if (audit.verified !== true) throw new Error("AUDIT_NOT_VERIFIED");
  if (audit.executionAuthorization !== 0 || audit.liveSigning || audit.broadcastEnabled) {
    throw new Error("AUDIT_POLICY_VIOLATION");
  }
  hash(audit.auditId, "INVALID_AUDIT_ID");
  transactionHash(audit.transactionHash, "INVALID_TRANSACTION_HASH");
  transactionHash(audit.repaymentTransactionHash, "INVALID_REPAYMENT_TRANSACTION_HASH");
  address(audit.signerAddress, "INVALID_SIGNER_ADDRESS");
  address(audit.transactionTo, "INVALID_TRANSACTION_RECIPIENT");
  address(audit.loanToken, "INVALID_LOAN_TOKEN");
  if (!Number.isInteger(audit.chainId) || audit.chainId <= 0) throw new Error("INVALID_CHAIN_ID");
  if (audit.receiptBlockNumber < 0n || audit.repaymentBlockNumber < 0n) throw new Error("INVALID_BLOCK_NUMBER");
  if (audit.loanAmount < 0n || audit.repaymentAmount < 0n || audit.finalLoanAssetBalance < 0n) throw new Error("INVALID_AUDIT_AMOUNT");
  if (audit.realizedProfitTokenUnits < 0n || audit.minimumProfitTokenUnits < 0n) throw new Error("INVALID_PROFIT_AMOUNT");
  if (audit.gasUsed <= 0n || audit.effectiveGasPriceWei <= 0n) throw new Error("INVALID_GAS_ECONOMICS");
  data(audit.transactionData, "INVALID_TRANSACTION_DATA");
  if (audit.transactionHash.toLowerCase() !== audit.repaymentTransactionHash.toLowerCase()) {
    throw new Error("AUDIT_TRANSACTION_MISMATCH");
  }
  if (audit.receiptBlockNumber !== audit.repaymentBlockNumber) throw new Error("AUDIT_BLOCK_MISMATCH");
  const expected = `sha256:${createHash("sha256").update(JSON.stringify(auditPayload(audit)), "utf8").digest("hex")}`;
  if (expected.toLowerCase() !== audit.auditId.toLowerCase()) throw new Error("AUDIT_ID_MISMATCH");
  return true;
}
