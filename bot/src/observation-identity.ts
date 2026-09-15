import { createHash } from "node:crypto";
import type { EngagementObservation } from "./engagement-observation.js";

export type ObservationIdentity = {
  observationId: string;
  canonicalPayload: string;
};

function jsonValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, jsonValue(item)]));
  }
  return value;
}

/** Creates a deterministic SHA-256 identity for a non-signing engagement observation. */
export function createObservationIdentity(observation: EngagementObservation): ObservationIdentity {
  const candidate = observation.planned.candidate;
  const payload = jsonValue({
    blockNumber: observation.blockNumber,
    blockTimestampMs: observation.blockTimestampMs,
    quoteBlockNumber: observation.quoteBlockNumber,
    quoteSourceId: observation.quoteSourceId,
    lenderPremiumBlockNumber: observation.lenderPremiumBlockNumber,
    lenderSourceId: observation.lenderSourceId,
    chainId: candidate.chainId,
    loanToken: candidate.loanToken,
    loanAmount: candidate.loanAmount,
    tokenUsdPrice: candidate.tokenUsdPrice,
    tokenDecimals: candidate.tokenDecimals,
    lenderPremiumUsd: candidate.lenderPremiumUsd,
    gasCostUsd: candidate.gasCostUsd,
    swapFeesUsd: candidate.swapFeesUsd,
    slippageUsd: candidate.slippageUsd,
    finalAmount: candidate.finalAmount,
    repaymentAmount: candidate.repaymentAmount,
    planHash: candidate.planHash,
    simulationPassed: candidate.simulationPassed,
    economicInputsVerified: candidate.economicInputsVerified,
    legs: candidate.legs,
    netProfitUsd: observation.planned.netProfitUsd,
    minimumProfitTokenUnits: observation.planned.minimumProfitTokenUnits,
    decision: observation.planned.decision,
  });
  const canonicalPayload = JSON.stringify(payload);
  const observationId = `sha256:${createHash("sha256").update(canonicalPayload, "utf8").digest("hex")}`;
  return Object.freeze({ observationId, canonicalPayload });
}
