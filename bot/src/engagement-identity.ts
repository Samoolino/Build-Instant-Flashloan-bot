import type { EngagementObservation } from "./engagement-observation.js";
import { createHash } from "node:crypto";

export type EngagementIdentity = {
  observationId: string;
  planHash: string;
  chainId: number;
  blockNumber: bigint;
  blockTimestampMs: number;
  quoteBlockNumber?: bigint;
  lenderPremiumBlockNumber: bigint;
  quoteSourceId?: string;
  lenderSourceId: string;
};

function canonicalObservation(observation: EngagementObservation): string {
  return JSON.stringify({
    chainId: observation.planned.candidate.chainId,
    loanToken: observation.planned.candidate.loanToken.toLowerCase(),
    loanAmount: observation.planned.candidate.loanAmount.toString(),
    planHash: observation.planned.candidate.planHash,
    blockNumber: observation.blockNumber.toString(),
    blockTimestampMs: observation.blockTimestampMs,
    quoteBlockNumber: observation.quoteBlockNumber?.toString() ?? null,
    lenderPremiumBlockNumber: observation.lenderPremiumBlockNumber.toString(),
    quoteSourceId: observation.quoteSourceId ?? null,
    lenderSourceId: observation.lenderSourceId,
  });
}

/** Produces a deterministic audit identity for a non-signing engagement observation. */
export function identifyEngagement(observation: EngagementObservation): EngagementIdentity {
  if (observation.blockNumber < 0n || observation.lenderPremiumBlockNumber < 0n) {
    throw new Error("INVALID_OBSERVATION_BLOCK");
  }
  if (!Number.isSafeInteger(observation.blockTimestampMs) || observation.blockTimestampMs < 0) {
    throw new Error("INVALID_OBSERVATION_TIMESTAMP");
  }
  if (!observation.lenderSourceId.trim()) throw new Error("LENDER_SOURCE_REQUIRED");

  const digest = createHash("sha256").update(canonicalObservation(observation)).digest("hex");
  return {
    observationId: `obs-${digest}`,
    planHash: observation.planned.candidate.planHash,
    chainId: observation.planned.candidate.chainId,
    blockNumber: observation.blockNumber,
    blockTimestampMs: observation.blockTimestampMs,
    quoteBlockNumber: observation.quoteBlockNumber,
    lenderPremiumBlockNumber: observation.lenderPremiumBlockNumber,
    quoteSourceId: observation.quoteSourceId,
    lenderSourceId: observation.lenderSourceId,
  };
}
