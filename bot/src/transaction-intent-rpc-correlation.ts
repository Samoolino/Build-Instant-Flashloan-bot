import type { RpcTransport } from "./rpc-client.js";
import type { ExternalSignerIntent } from "./external-signer-intent.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionEvidence } from "./post-execution-evidence.js";
import type { TransactionIntentCorrelation } from "./transaction-intent-correlation.js";
import { correlateTransactionToIntent } from "./transaction-intent-correlation.js";

type RpcTransaction = {
  hash?: string;
  from?: string;
  to?: string | null;
  input?: string;
  value?: string;
  chainId?: string;
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

function quantity(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(error);
  return BigInt(value);
}

/** Reads the externally broadcast transaction from the chain and correlates it to the locked intent/evidence. */
export async function correlateTransactionToIntentFromRpc(
  rpc: RpcTransport,
  record: ExecutionLockRecord,
  intent: ExternalSignerIntent,
  transactionHash: string,
  expectedSignerAddress: string,
  evidence: PostExecutionEvidence,
): Promise<TransactionIntentCorrelation> {
  hash(transactionHash, "INVALID_TRANSACTION_HASH");
  address(expectedSignerAddress, "INVALID_EXPECTED_SIGNER");

  const chainIdHex = await rpc.request<string>("eth_chainId", []);
  const chainId = Number(quantity(chainIdHex, "RPC_CHAIN_ID_INVALID"));
  if (!Number.isSafeInteger(chainId) || chainId !== record.chainId) throw new Error("TRANSACTION_CHAIN_MISMATCH");

  const tx = await rpc.request<RpcTransaction | null>("eth_getTransactionByHash", [transactionHash]);
  if (!tx) throw new Error("TRANSACTION_NOT_FOUND");
  if (tx.hash?.toLowerCase() !== transactionHash.toLowerCase()) throw new Error("TRANSACTION_HASH_MISMATCH");
  if (!tx.from) throw new Error("TRANSACTION_SENDER_REQUIRED");
  address(tx.from, "INVALID_TRANSACTION_SENDER");
  if (tx.from.toLowerCase() !== expectedSignerAddress.toLowerCase()) throw new Error("TRANSACTION_SIGNER_MISMATCH");
  if (!tx.to) throw new Error("TRANSACTION_RECIPIENT_REQUIRED");
  if (tx.input === undefined) throw new Error("TRANSACTION_DATA_REQUIRED");
  if (tx.value === undefined) throw new Error("TRANSACTION_VALUE_REQUIRED");
  if (tx.chainId !== undefined && Number(quantity(tx.chainId, "TRANSACTION_CHAIN_ID_INVALID")) !== record.chainId) {
    throw new Error("TRANSACTION_CHAIN_MISMATCH");
  }

  hex(tx.input, "INVALID_TRANSACTION_DATA");
  const transaction = {
    transactionHash,
    from: tx.from,
    to: tx.to,
    data: tx.input,
    valueWei: quantity(tx.value, "TRANSACTION_VALUE_INVALID"),
    chainId,
  };

  return correlateTransactionToIntent(record, intent, transaction, evidence);
}
