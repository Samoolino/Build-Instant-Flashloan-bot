import type { ExternalSignerIntent } from "./external-signer-intent.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionEvidence } from "./post-execution-evidence.js";

export type BroadcastTransaction = {
  transactionHash: string;
  from: string;
  to: string;
  data: string;
  valueWei: bigint;
  chainId: number;
};

export type TransactionIntentCorrelation = {
  observationId: string;
  planHash: string;
  chainId: number;
  transactionHash: string;
  from: string;
  to: string;
  data: string;
  valueWei: bigint;
  receiptBlockNumber: bigint;
  repaymentAmount: bigint;
  realizedProfitTokenUnits: bigint;
  minimumProfitTokenUnits: bigint;
  executionAuthorization: 0;
  liveSigning: false;
  broadcastEnabled: false;
  verified: true;
};

function address(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(error);
}
function hash(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(error);
}
function hex(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]*$/.test(value)) throw new Error(error);
}

/** Correlates an externally broadcast transaction to the exact unsigned intent and verified evidence. */
export function correlateTransactionToIntent(record: ExecutionLockRecord, intent: ExternalSignerIntent, transaction: BroadcastTransaction, evidence: PostExecutionEvidence): TransactionIntentCorrelation {
  if (record.executionAuthorization !== 0 || record.liveSigning || record.broadcastEnabled) throw new Error("CORRELATION_POLICY_VIOLATION");
  if (intent.executionAuthorization !== 0 || intent.liveSigning || intent.broadcastEnabled) throw new Error("INTENT_POLICY_VIOLATION");
  if (intent.observationId !== record.observationId) throw new Error("OBSERVATION_ID_MISMATCH");
  if (intent.planHash !== record.planHash) throw new Error("PLAN_HASH_MISMATCH");
  if (intent.chainId !== record.chainId || transaction.chainId !== record.chainId) throw new Error("TRANSACTION_CHAIN_MISMATCH");
  address(transaction.from, "INVALID_TRANSACTION_SENDER");
  address(transaction.to, "INVALID_TRANSACTION_RECIPIENT");
  hex(transaction.data, "INVALID_TRANSACTION_DATA");
  hash(transaction.transactionHash, "INVALID_TRANSACTION_HASH");
  if (transaction.to.toLowerCase() !== intent.to.toLowerCase()) throw new Error("TRANSACTION_RECIPIENT_MISMATCH");
  if (transaction.data.toLowerCase() !== intent.data.toLowerCase()) throw new Error("TRANSACTION_DATA_MISMATCH");
  if (transaction.valueWei !== intent.valueWei) throw new Error("TRANSACTION_VALUE_MISMATCH");
  if (evidence.receipt.transactionHash.toLowerCase() !== transaction.transactionHash.toLowerCase()) throw new Error("EVIDENCE_TRANSACTION_MISMATCH");
  if (evidence.receipt.to.toLowerCase() !== transaction.to.toLowerCase()) throw new Error("RECEIPT_TARGET_MISMATCH");
  if (evidence.repayment.repaymentAmount !== record.repaymentAmount) throw new Error("REPAYMENT_AMOUNT_MISMATCH");
  if (evidence.realizedProfit.minimumProfitTokenUnits !== record.minimumProfitTokenUnits) throw new Error("MINIMUM_PROFIT_MISMATCH");
  return Object.freeze({ observationId: record.observationId, planHash: record.planHash, chainId: record.chainId, transactionHash: transaction.transactionHash, from: transaction.from, to: transaction.to, data: transaction.data, valueWei: transaction.valueWei, receiptBlockNumber: evidence.receipt.blockNumber, repaymentAmount: evidence.repayment.repaymentAmount, realizedProfitTokenUnits: evidence.realizedProfit.realizedProfitTokenUnits, minimumProfitTokenUnits: record.minimumProfitTokenUnits, executionAuthorization: 0, liveSigning: false, broadcastEnabled: false, verified: true });
}
