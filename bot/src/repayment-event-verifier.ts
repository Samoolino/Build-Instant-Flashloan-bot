import type { ExecutionLockRecord } from "./engagement-record.js";

export type TransactionLog = {
  address: string;
  topics: string[];
  data: string;
  logIndex?: string;
};

export type RepaymentEventEvidence = {
  lenderAddress: string;
  loanToken: string;
  executorAddress: string;
  repaymentAmount: bigint;
  transactionHash: string;
  blockNumber: bigint;
  matchedLogIndex?: bigint;
  verified: true;
};

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a8df523b3ef";

function address(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(error);
}

function topic(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(error);
}

function quantity(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(error);
  return BigInt(value);
}

function topicAddress(value: string): string {
  topic(value, "INVALID_TRANSFER_TOPIC");
  return `0x${value.slice(-40)}`;
}

/** Verifies an exact ERC-20 repayment Transfer from the executor to the lender. No signing or broadcasting occurs. */
export function verifyAaveRepaymentTransfer(
  record: ExecutionLockRecord,
  lenderAddress: string,
  executorAddress: string,
  transactionHash: string,
  blockNumber: bigint,
  logs: readonly TransactionLog[],
): RepaymentEventEvidence {
  address(lenderAddress, "INVALID_LENDER_ADDRESS");
  address(executorAddress, "INVALID_EXECUTOR_ADDRESS");
  address(record.loanToken, "INVALID_LOCK_LOAN_TOKEN");
  if (!/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) throw new Error("INVALID_TRANSACTION_HASH");
  if (blockNumber < record.blockNumber) throw new Error("REPAYMENT_BLOCK_REGRESSED");
  if (record.executionAuthorization !== 0 || record.liveSigning || record.broadcastEnabled) {
    throw new Error("REPAYMENT_POLICY_VIOLATION");
  }

  for (const log of logs) {
    if (log.address.toLowerCase() !== record.loanToken.toLowerCase()) continue;
    if (log.topics.length < 3 || log.topics[0].toLowerCase() !== TRANSFER_TOPIC) continue;
    const from = topicAddress(log.topics[1]);
    const to = topicAddress(log.topics[2]);
    if (from.toLowerCase() !== executorAddress.toLowerCase()) continue;
    if (to.toLowerCase() !== lenderAddress.toLowerCase()) continue;
    if (!/^0x[0-9a-fA-F]{64}$/.test(log.data)) throw new Error("INVALID_TRANSFER_AMOUNT");
    const amount = quantity(log.data, "INVALID_TRANSFER_AMOUNT");
    if (amount !== record.repaymentAmount) continue;
    const logIndex = log.logIndex === undefined ? undefined : quantity(log.logIndex, "INVALID_LOG_INDEX");
    return Object.freeze({
      lenderAddress,
      loanToken: record.loanToken,
      executorAddress,
      repaymentAmount: amount,
      transactionHash,
      blockNumber,
      matchedLogIndex: logIndex,
      verified: true,
    });
  }
  throw new Error("REPAYMENT_TRANSFER_NOT_FOUND");
}
