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

/**
 * Converts a USD profit floor into token base units without floating-point arithmetic.
 * The result is rounded up so the on-chain minimum cannot be weaker than the USD policy.
 */
export function usdFloorToTokenUnits(
  minimumUsd: number,
  tokenUsdPrice: number,
  decimals: number,
): bigint {
  if (!Number.isFinite(minimumUsd) || minimumUsd < 0) throw new Error("INVALID_MINIMUM_USD");
  if (!Number.isFinite(tokenUsdPrice) || tokenUsdPrice <= 0) throw new Error("INVALID_TOKEN_USD_PRICE");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("INVALID_TOKEN_DECIMALS");

  const unitsPerToken = 10 ** decimals;
  const rawUnits = (minimumUsd / tokenUsdPrice) * unitsPerToken;
  if (!Number.isFinite(rawUnits) || rawUnits > Number.MAX_SAFE_INTEGER) {
    throw new Error("USD_CONVERSION_REQUIRES_HIGH_PRECISION_INPUT");
  }
  return BigInt(Math.ceil(rawUnits));
}
