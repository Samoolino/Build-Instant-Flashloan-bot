export const MINIMUM_NET_PROFIT_USD = 2;
export const TARGET_PROFIT_USD = 100;

export type ProfitabilityDecision = {
  eligible: boolean;
  reason: string;
};

export function evaluateNetProfitUsd(netProfitUsd: number): ProfitabilityDecision {
  if (!Number.isFinite(netProfitUsd)) return { eligible: false, reason: "INVALID_NET_PROFIT" };
  if (netProfitUsd < MINIMUM_NET_PROFIT_USD) return { eligible: false, reason: "BELOW_HARD_FLOOR" };
  return { eligible: true, reason: netProfitUsd >= TARGET_PROFIT_USD ? "TARGET_REACHED" : "ABOVE_HARD_FLOOR" };
}
