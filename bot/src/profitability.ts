export const MINIMUM_NET_PROFIT_USD = 2;
export const TARGET_PROFIT_USD = 100;

export type ProfitabilityDecision = {
  eligible: boolean;
  reason: string;
};

export function evaluateNetProfitUsd(
  netProfitUsd: number,
  minimumNetProfitUsd: number = MINIMUM_NET_PROFIT_USD,
): ProfitabilityDecision {
  if (!Number.isFinite(netProfitUsd)) return { eligible: false, reason: "INVALID_NET_PROFIT" };
  if (!Number.isFinite(minimumNetProfitUsd) || minimumNetProfitUsd < 0) {
    return { eligible: false, reason: "INVALID_MINIMUM_NET_PROFIT" };
  }
  if (netProfitUsd < minimumNetProfitUsd) return { eligible: false, reason: "BELOW_HARD_FLOOR" };
  return { eligible: true, reason: netProfitUsd >= TARGET_PROFIT_USD ? "TARGET_REACHED" : "ABOVE_HARD_FLOOR" };
}

function toMicrounits(value: number, error: string): bigint {
  if (!Number.isFinite(value) || value < 0) throw new Error(error);
  const scaled = Math.round(value * 1_000_000);
  if (!Number.isSafeInteger(scaled)) throw new Error("USD_CONVERSION_REQUIRES_HIGH_PRECISION_INPUT");
  return BigInt(scaled);
}

/** Converts a USD floor into token base units, rounding up conservatively. */
export function usdFloorToTokenUnits(
  minimumUsd: number,
  tokenUsdPrice: number,
  decimals: number,
): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("INVALID_TOKEN_DECIMALS");
  const usdMicro = toMicrounits(minimumUsd, "INVALID_MINIMUM_USD");
  const priceMicro = toMicrounits(tokenUsdPrice, "INVALID_TOKEN_USD_PRICE");
  if (priceMicro === 0n) throw new Error("INVALID_TOKEN_USD_PRICE");

  const baseUnits = 10n ** BigInt(decimals);
  return (usdMicro * baseUnits + priceMicro - 1n) / priceMicro;
}
