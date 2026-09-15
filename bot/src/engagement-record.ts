import type { EngagementObservation } from "./engagement-observation.js";
import { createObservationIdentity } from "./observation-identity.js";
import type { LiveEngagementState } from "./live-engagement-state.js";

export type ExecutionLockRecord = {
  observationId: string;
  phase: "EXECUTION_LOCKED";
  chainId: number;
  blockNumber: bigint;
  blockTimestampMs: number;
  quoteBlockNumber?: bigint;
  lenderPremiumBlockNumber: bigint;
  quoteSourceId?: string;
  lenderSourceId: string;
  planHash: string;
  simulationPassed: boolean;
  economicInputsVerified: boolean;
  netProfitUsd: number;
  minimumProfitTokenUnits: bigint;
  decision: { eligible: boolean; reason: string };
  gasCostUsd: number;
  loanToken: string;
  loanAmount: bigint;
  repaymentAmount: bigint;
  executionAuthorization: 0;
  liveSigning: false;
  broadcastEnabled: false;
};

function requireFiniteNonNegative(value: number, error: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(error);
}

/** Builds an immutable execution-lock record from one verified observation and its locked state. */
export function createExecutionLockRecord(
  observation: EngagementObservation,
  state: LiveEngagementState,
): ExecutionLockRecord {
  if (state.phase !== "EXECUTION_LOCKED") throw new Error("EXECUTION_LOCK_REQUIRED");
  if (state.chainId !== observation.planned.candidate.chainId) throw new Error("LOCK_CHAIN_MISMATCH");
  if (state.executionAuthorization !== 0 || state.liveSigning || state.broadcastEnabled) {
    throw new Error("EXECUTION_LOCK_POLICY_VIOLATION");
  }

  const candidate = observation.planned.candidate;
  const identity = createObservationIdentity(observation);
  if (!candidate.planHash.trim()) throw new Error("PLAN_HASH_REQUIRED");
  if (!candidate.economicInputsVerified) throw new Error("ECONOMIC_INPUTS_UNVERIFIED");
  if (!candidate.simulationPassed) throw new Error("SIMULATION_REQUIRED");
  if (!observation.planned.decision.eligible) throw new Error("OBSERVATION_NOT_PROFITABLE");
  requireFiniteNonNegative(observation.planned.netProfitUsd, "INVALID_NET_PROFIT");
  requireFiniteNonNegative(candidate.gasCostUsd, "INVALID_GAS_COST_USD");

  return Object.freeze({
    observationId: identity.observationId,
    phase: "EXECUTION_LOCKED",
    chainId: candidate.chainId,
    blockNumber: observation.blockNumber,
    blockTimestampMs: observation.blockTimestampMs,
    quoteBlockNumber: observation.quoteBlockNumber,
    lenderPremiumBlockNumber: observation.lenderPremiumBlockNumber,
    quoteSourceId: observation.quoteSourceId,
    lenderSourceId: observation.lenderSourceId,
    planHash: candidate.planHash,
    simulationPassed: candidate.simulationPassed,
    economicInputsVerified: candidate.economicInputsVerified,
    netProfitUsd: observation.planned.netProfitUsd,
    minimumProfitTokenUnits: observation.planned.minimumProfitTokenUnits,
    decision: observation.planned.decision,
    gasCostUsd: candidate.gasCostUsd,
    loanToken: candidate.loanToken,
    loanAmount: candidate.loanAmount,
    repaymentAmount: candidate.repaymentAmount,
    executionAuthorization: 0,
    liveSigning: false,
    broadcastEnabled: false,
  });
}

/** Recomputes the identity and verifies that a lock record still matches its source observation. */
export function verifyExecutionLockRecord(
  observation: EngagementObservation,
  record: ExecutionLockRecord,
): void {
  const identity = createObservationIdentity(observation);
  if (record.observationId !== identity.observationId) throw new Error("OBSERVATION_ID_MISMATCH");
  if (record.phase !== "EXECUTION_LOCKED") throw new Error("EXECUTION_LOCK_REQUIRED");
  if (record.chainId !== observation.planned.candidate.chainId || record.blockNumber !== observation.blockNumber) {
    throw new Error("OBSERVATION_CONTEXT_MISMATCH");
  }
  if (record.planHash !== observation.planned.candidate.planHash) throw new Error("PLAN_HASH_MISMATCH");
  if (record.executionAuthorization !== 0 || record.liveSigning || record.broadcastEnabled) {
    throw new Error("EXECUTION_LOCK_POLICY_VIOLATION");
  }
}
