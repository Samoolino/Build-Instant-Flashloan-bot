export type LiveEngagementPhase =
  | "IDLE"
  | "DISCOVERING"
  | "QUOTING"
  | "SIMULATING"
  | "PROFITABLE"
  | "REJECTED"
  | "EXECUTION_LOCKED";

export type LiveEngagementState = {
  phase: LiveEngagementPhase;
  chainId: number;
  sourceIds: readonly string[];
  quoteBlockNumber?: bigint;
  observedAtMs: number;
  simulationPassed: boolean;
  eligible: boolean;
  executionAuthorization: 0;
  liveSigning: false;
  broadcastEnabled: false;
};

export type LiveEngagementObservation = {
  chainId: number;
  sourceIds: readonly string[];
  quoteBlockNumber?: bigint;
  observedAtMs?: number;
  simulationPassed?: boolean;
  eligible?: boolean;
};

function requireChainId(chainId: number): void {
  if (!Number.isInteger(chainId) || chainId <= 0) throw new Error("INVALID_ENGAGEMENT_CHAIN_ID");
}

function requireSources(sourceIds: readonly string[]): readonly string[] {
  if (sourceIds.length === 0 || sourceIds.some((id) => !id.trim())) {
    throw new Error("ENGAGEMENT_SOURCE_REQUIRED");
  }
  return Object.freeze([...sourceIds]);
}

function requireObservedAt(observedAtMs: number): number {
  if (!Number.isSafeInteger(observedAtMs) || observedAtMs < 0) {
    throw new Error("INVALID_ENGAGEMENT_TIMESTAMP");
  }
  return observedAtMs;
}

/** Creates an observation-only live engagement state. It cannot authorize signing or broadcasting. */
export function createLiveEngagementState(observation: LiveEngagementObservation): LiveEngagementState {
  requireChainId(observation.chainId);
  const sourceIds = requireSources(observation.sourceIds);
  const observedAtMs = requireObservedAt(observation.observedAtMs ?? Date.now());
  if (observation.quoteBlockNumber !== undefined && observation.quoteBlockNumber < 0n) {
    throw new Error("INVALID_ENGAGEMENT_BLOCK");
  }

  const simulationPassed = observation.simulationPassed ?? false;
  const eligible = observation.eligible ?? false;
  const phase: LiveEngagementPhase = !simulationPassed
    ? "SIMULATING"
    : eligible
      ? "PROFITABLE"
      : "REJECTED";

  return Object.freeze({
    phase,
    chainId: observation.chainId,
    sourceIds,
    quoteBlockNumber: observation.quoteBlockNumber,
    observedAtMs,
    simulationPassed,
    eligible,
    executionAuthorization: 0,
    liveSigning: false,
    broadcastEnabled: false,
  });
}

/** Moves an observed profitable state into the explicit locked execution boundary. */
export function lockForExecution(state: LiveEngagementState): LiveEngagementState {
  if (state.phase !== "PROFITABLE") throw new Error("ENGAGEMENT_NOT_PROFITABLE");
  return Object.freeze({ ...state, phase: "EXECUTION_LOCKED", executionAuthorization: 0, liveSigning: false, broadcastEnabled: false });
}
