import type { RpcTransport } from "./rpc-client.js";
import type { ExecutionLockRecord } from "./engagement-record.js";

export type TransactionReceipt = {
  transactionHash: string;
  blockHash: string;
  blockNumber: string;
  status: string;
  from: string;
  to: string | null;
  gasUsed: string;
  effectiveGasPrice?: string;
};

export type PostExecutionVerification = {
  transactionHash: string;
  blockNumber: bigint;
  status: "SUCCESS";
  to: string;
  gasUsed: bigint;
  effectiveGasPriceWei: bigint;
  executionAuthorization: 0;
  liveSigning: false;
  broadcastEnabled: false;
};

function address(value: string, error = "INVALID_POST_EXECUTION_ADDRESS"): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(error);
}

function hash(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(error);
}

function quantity(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(error);
  return BigInt(value);
}

/** Reads and verifies an externally broadcast transaction receipt. It never signs or broadcasts. */
export async function verifyPostExecutionReceipt(
  rpc: RpcTransport,
  record: ExecutionLockRecord,
  transactionHash: string,
  expectedTo: string,
): Promise<PostExecutionVerification> {
  hash(transactionHash, "INVALID_TRANSACTION_HASH");
  address(expectedTo, "INVALID_EXPECTED_RECIPIENT");
  if (record.executionAuthorization !== 0 || record.liveSigning || record.broadcastEnabled) {
    throw new Error("POST_EXECUTION_POLICY_VIOLATION");
  }

  const receipt = await rpc.request<TransactionReceipt | null>("eth_getTransactionReceipt", [transactionHash]);
  if (!receipt) throw new Error("TRANSACTION_RECEIPT_NOT_FOUND");
  if (receipt.transactionHash.toLowerCase() !== transactionHash.toLowerCase()) throw new Error("RECEIPT_HASH_MISMATCH");
  hash(receipt.blockHash, "INVALID_RECEIPT_BLOCK_HASH");
  const blockNumber = quantity(receipt.blockNumber, "INVALID_RECEIPT_BLOCK_NUMBER");
  if (receipt.status !== "0x1") throw new Error("TRANSACTION_FAILED");
  address(receipt.from, "INVALID_RECEIPT_SENDER");
  if (!receipt.to) throw new Error("RECEIPT_RECIPIENT_MISSING");
  address(receipt.to, "INVALID_RECEIPT_RECIPIENT");
  if (receipt.to.toLowerCase() !== expectedTo.toLowerCase()) throw new Error("RECEIPT_RECIPIENT_MISMATCH");
  const gasUsed = quantity(receipt.gasUsed, "INVALID_RECEIPT_GAS_USED");
  if (gasUsed === 0n) throw new Error("RECEIPT_GAS_USED_ZERO");
  const effectiveGasPriceWei = quantity(receipt.effectiveGasPrice ?? "0x0", "INVALID_EFFECTIVE_GAS_PRICE");
  return Object.freeze({
    transactionHash,
    blockNumber,
    status: "SUCCESS",
    to: receipt.to,
    gasUsed,
    effectiveGasPriceWei,
    executionAuthorization: 0,
    liveSigning: false,
    broadcastEnabled: false,
  });
}
