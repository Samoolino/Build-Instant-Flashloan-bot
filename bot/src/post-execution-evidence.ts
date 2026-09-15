import type { RpcTransport } from "./rpc-client.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionVerification } from "./post-execution-verifier.js";
import { verifyPostExecutionReceipt } from "./post-execution-verifier.js";
import { verifyAaveRepaymentTransfer, type RepaymentEventEvidence, type TransactionLog } from "./repayment-event-verifier.js";
import { verifyRealizedProfitAgainstLock, type RealizedProfitVerification } from "./realized-profit-verifier.js";

export type PostExecutionEvidence = {
  receipt: PostExecutionVerification;
  repayment: RepaymentEventEvidence;
  realizedProfit: RealizedProfitVerification;
  verified: true;
};

export async function collectPostExecutionEvidence(
  rpc: RpcTransport,
  record: ExecutionLockRecord,
  transactionHash: string,
  expectedTo: string,
  lenderAddress: string,
  executorAddress: string,
  logs: readonly TransactionLog[],
  finalLoanAssetBalance: bigint,
): Promise<PostExecutionEvidence> {
  const receipt = await verifyPostExecutionReceipt(rpc, record, transactionHash, expectedTo);
  if (receipt.transactionHash.toLowerCase() !== transactionHash.toLowerCase()) throw new Error("EVIDENCE_TRANSACTION_MISMATCH");
  const repayment = verifyAaveRepaymentTransfer(record, lenderAddress, executorAddress, transactionHash, receipt.blockNumber, logs);
  const realizedProfit = verifyRealizedProfitAgainstLock(record, finalLoanAssetBalance);
  return Object.freeze({ receipt, repayment, realizedProfit, verified: true });
}
