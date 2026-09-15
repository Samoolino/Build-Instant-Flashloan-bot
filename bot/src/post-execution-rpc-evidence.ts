import type { ExecutionLockRecord } from "./engagement-record.js";
import type { RpcTransport } from "./rpc-client.js";
import type { TransactionLog } from "./repayment-event-verifier.js";
import type { PostExecutionEvidence } from "./post-execution-evidence.js";
import { collectPostExecutionEvidence } from "./post-execution-evidence.js";
import { verifyPostExecutionReceipt } from "./post-execution-verifier.js";

const BALANCE_OF_SELECTOR = "0x70a08231";

type RpcReceipt = {
  transactionHash?: string;
  blockNumber?: string;
  logs?: readonly TransactionLog[];
};

function address(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(error);
}

function quantity(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(error);
  return BigInt(value);
}

function blockTag(blockNumber: bigint): string {
  return `0x${blockNumber.toString(16)}`;
}

function balanceCallData(owner: string): string {
  address(owner, "INVALID_EXECUTOR_ADDRESS");
  return `${BALANCE_OF_SELECTOR}${owner.slice(2).padStart(64, "0")}`;
}

/**
 * Collects post-execution evidence directly from the pinned chain state.
 * The caller supplies only the expected transaction/addresses; receipt logs and
 * the final loan-asset balance are fetched from the RPC. This function never
 * signs or broadcasts a transaction.
 */
export async function collectPostExecutionEvidenceFromRpc(
  rpc: RpcTransport,
  record: ExecutionLockRecord,
  transactionHash: string,
  expectedTo: string,
  lenderAddress: string,
  executorAddress: string,
): Promise<PostExecutionEvidence> {
  address(expectedTo, "INVALID_EXPECTED_RECIPIENT");
  address(lenderAddress, "INVALID_LENDER_ADDRESS");
  address(executorAddress, "INVALID_EXECUTOR_ADDRESS");

  const receipt = await verifyPostExecutionReceipt(rpc, record, transactionHash, expectedTo);
  const rawReceipt = await rpc.request<RpcReceipt | null>("eth_getTransactionReceipt", [transactionHash]);
  if (!rawReceipt) throw new Error("RECEIPT_REQUIRED");
  if (rawReceipt.transactionHash?.toLowerCase() !== transactionHash.toLowerCase()) {
    throw new Error("EVIDENCE_TRANSACTION_MISMATCH");
  }
  if (rawReceipt.blockNumber === undefined) throw new Error("RECEIPT_BLOCK_REQUIRED");
  const receiptBlock = quantity(rawReceipt.blockNumber, "RECEIPT_BLOCK_INVALID");
  if (receiptBlock !== receipt.blockNumber) throw new Error("RECEIPT_BLOCK_MISMATCH");
  if (!Array.isArray(rawReceipt.logs)) throw new Error("RECEIPT_LOGS_REQUIRED");

  const finalBalanceRaw = await rpc.request<string>("eth_call", [
    { to: record.loanToken, data: balanceCallData(executorAddress) },
    blockTag(receiptBlock),
  ]);
  const finalLoanAssetBalance = quantity(finalBalanceRaw, "FINAL_LOAN_ASSET_BALANCE_INVALID");

  return collectPostExecutionEvidence(
    rpc,
    record,
    transactionHash,
    expectedTo,
    lenderAddress,
    executorAddress,
    rawReceipt.logs,
    finalLoanAssetBalance,
  );
}
