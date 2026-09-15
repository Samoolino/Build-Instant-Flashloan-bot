import type { EngagementObservation } from "./engagement-observation.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import { verifyExecutionLockRecord } from "./engagement-record.js";
import { verifyExternalSignerIntent, type ExternalSignerIntent } from "./external-signer-intent.js";

export type PreSignGuardResult = {
  observationId: string;
  chainId: number;
  planHash: string;
  netProfitUsd: number;
  minimumProfitTokenUnits: bigint;
  expiresAtMs: number;
  signable: false;
};

/** Revalidates an unsigned intent immediately before an independent signer. It never signs or broadcasts. */
export function runPreSignGuard(
  observation: EngagementObservation,
  record: ExecutionLockRecord,
  intent: ExternalSignerIntent,
  currentBlockNumber: bigint,
  nowMs: number,
  maxObservationAgeMs = 30_000,
): PreSignGuardResult {
  if (currentBlockNumber < 0n) throw new Error("INVALID_CURRENT_BLOCK");
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("INVALID_GUARD_TIME");
  if (!Number.isSafeInteger(maxObservationAgeMs) || maxObservationAgeMs <= 0) throw new Error("INVALID_OBSERVATION_AGE");
  verifyExecutionLockRecord(observation, record);
  verifyExternalSignerIntent(intent, nowMs);
  if (intent.chainId !== observation.planned.candidate.chainId) throw new Error("INTENT_CHAIN_MISMATCH");
  if (intent.observationId !== record.observationId) throw new Error("INTENT_OBSERVATION_MISMATCH");
  if (intent.planHash !== record.planHash) throw new Error("INTENT_PLAN_HASH_MISMATCH");
  if (currentBlockNumber < observation.blockNumber) throw new Error("CURRENT_BLOCK_REGRESSED");
  if (nowMs - observation.blockTimestampMs > maxObservationAgeMs) throw new Error("OBSERVATION_STALE");
  if (!observation.planned.decision.eligible) throw new Error("PROFITABILITY_REJECTED");
  if (!observation.planned.candidate.simulationPassed) throw new Error("SIMULATION_REQUIRED");
  if (!observation.planned.candidate.economicInputsVerified) throw new Error("ECONOMIC_INPUTS_UNVERIFIED");
  if (observation.planned.candidate.finalAmount < observation.planned.candidate.repaymentAmount) throw new Error("INSUFFICIENT_REPAYMENT");
  return Object.freeze({
    observationId: record.observationId,
    chainId: record.chainId,
    planHash: record.planHash,
    netProfitUsd: observation.planned.netProfitUsd,
    minimumProfitTokenUnits: observation.planned.minimumProfitTokenUnits,
    expiresAtMs: intent.expiresAtMs,
    signable: false,
  });
}
