import type { ExecutionLockRecord } from "./engagement-record.js";

export type ExternalSignerIntent = {
  kind: "EXTERNAL_SIGNER_INTENT";
  observationId: string;
  chainId: number;
  to: string;
  data: string;
  valueWei: bigint;
  planHash: string;
  loanToken: string;
  loanAmount: bigint;
  repaymentAmount: bigint;
  minimumProfitTokenUnits: bigint;
  expiresAtMs: number;
  executionAuthorization: 0;
  liveSigning: false;
  broadcastEnabled: false;
};

function address(value: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("INVALID_SIGNER_INTENT_ADDRESS");
}
function hex(value: string): void {
  if (!/^0x[0-9a-fA-F]*$/.test(value)) throw new Error("INVALID_SIGNER_INTENT_DATA");
}

/** Creates unsigned transaction intent metadata for an external signer. It never signs or broadcasts. */
export function createExternalSignerIntent(record: ExecutionLockRecord, to: string, data: string, valueWei = 0n, nowMs = Date.now(), ttlMs = 30_000): ExternalSignerIntent {
  address(to); hex(data);
  if (valueWei < 0n || valueWei >= (1n << 256n)) throw new Error("INVALID_SIGNER_INTENT_VALUE");
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("INVALID_SIGNER_INTENT_TIME");
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw new Error("INVALID_SIGNER_INTENT_TTL");
  if (record.executionAuthorization !== 0 || record.liveSigning || record.broadcastEnabled) throw new Error("EXECUTION_LOCK_POLICY_VIOLATION");
  return Object.freeze({ kind: "EXTERNAL_SIGNER_INTENT", observationId: record.observationId, chainId: record.chainId, to, data, valueWei, planHash: record.planHash, loanToken: record.loanToken, loanAmount: record.loanAmount, repaymentAmount: record.repaymentAmount, minimumProfitTokenUnits: record.minimumProfitTokenUnits, expiresAtMs: nowMs + ttlMs, executionAuthorization: 0, liveSigning: false, broadcastEnabled: false });
}

export function verifyExternalSignerIntent(intent: ExternalSignerIntent, nowMs = Date.now()): void {
  if (intent.kind !== "EXTERNAL_SIGNER_INTENT") throw new Error("INVALID_SIGNER_INTENT_KIND");
  address(intent.to); hex(intent.data);
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("INVALID_SIGNER_INTENT_TIME");
  if (nowMs >= intent.expiresAtMs) throw new Error("SIGNER_INTENT_EXPIRED");
  if (intent.executionAuthorization !== 0 || intent.liveSigning || intent.broadcastEnabled) throw new Error("SIGNER_INTENT_POLICY_VIOLATION");
}
