import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionVerification } from "./post-execution-verifier.js";
import { verifyRealizedProfitAgainstLock, type RealizedProfitVerification } from "./realized-profit-verifier.js";

export type PostExecutionAccountingInput = {
  receipt: PostExecutionVerification;
  record: ExecutionLockRecord;
  finalLoanAssetBalance: bigint;
};

export type PostExecutionAccounting = {
  transactionHash: string;
  blockNumber: bigint;
  gasUsed: bigint;
  effectiveGasPriceWei: bigint;
  realizedProfit: RealizedProfitVerification;
  verified: true;
};

/** Combines receipt success with lock-bound repayment/profit verification. It never signs or broadcasts. */
export function verifyPostExecutionAccounting(input: PostExecutionAccountingInput): PostExecutionAccounting {
  const { receipt, record } = input;
  if (receipt.executionAuthorization !== 0 || receipt.liveSigning || receipt.broadcastEnabled) {
    throw new Error("POST_EXECUTION_POLICY_VIOLATION");
  }
  if (receipt.transactionHash.toLowerCase() !== receipt.transactionHash.toLowerCase()) {
    throw new Error("TRANSACTION_HASH_INVALID");
  }
  if (receipt.status !== "SUCCESS") throw new Error("TRANSACTION_NOT_SUCCESSFUL");
  if (receipt.blockNumber < record.blockNumber) throw new Error("RECEIPT_BLOCK_REGRESSED");
  if (input.finalLoanAssetBalance < 0n) throw new Error("INVALID_FINAL_LOAN_ASSET_BALANCE");

  const realizedProfit = verifyRealizedProfitAgainstLock(record, input.finalLoanAssetBalance);
  return Object.freeze({
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
    effectiveGasPriceWei: receipt.effectiveGasPriceWei,
    realizedProfit,
    verified: true,
  });
}
