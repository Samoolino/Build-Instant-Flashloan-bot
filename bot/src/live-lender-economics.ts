import type { RpcTransport } from "./rpc-client.js";
import type { RouteCandidate } from "./route-planner.js";
import { readAaveV3FlashLoanPremium } from "./aave-premium.js";

export type LiveLenderEconomics = {
  premiumBps: bigint;
  premiumTokenUnits: bigint;
  premiumUsd: number;
  blockNumber: bigint;
  sourceId: string;
};

function usdMicro(value: number, error: string): bigint {
  if (!Number.isFinite(value) || value < 0) throw new Error(error);
  const scaled = Math.round(value * 1_000_000);
  if (!Number.isSafeInteger(scaled)) throw new Error("USD_PRICE_REQUIRES_HIGH_PRECISION_INPUT");
  return BigInt(scaled);
}

/** Resolves Aave V3 lender cost from the live pool at the same pinned block used for the engagement. */
export async function applyLiveAaveV3LenderEconomics(
  candidate: RouteCandidate,
  rpc: RpcTransport,
  poolAddress: string,
  blockNumber: bigint,
  sourceId = "aave-v3:flashloan-premium",
): Promise<{ candidate: RouteCandidate; economics: LiveLenderEconomics }> {
  if (candidate.loanAmount <= 0n) throw new Error("INVALID_LOAN_AMOUNT");
  if (candidate.tokenDecimals < 0 || candidate.tokenDecimals > 255 || !Number.isInteger(candidate.tokenDecimals)) {
    throw new Error("INVALID_TOKEN_DECIMALS");
  }
  const tokenPriceMicro = usdMicro(candidate.tokenUsdPrice, "INVALID_TOKEN_USD_PRICE");
  if (tokenPriceMicro === 0n) throw new Error("INVALID_TOKEN_USD_PRICE");

  const premium = await readAaveV3FlashLoanPremium(rpc, poolAddress, blockNumber, sourceId);
  const premiumTokenUnits = (candidate.loanAmount * premium.premiumBps + 9_999n) / 10_000n;
  const baseUnits = 10n ** BigInt(candidate.tokenDecimals);
  const premiumUsdMicro = (premiumTokenUnits * tokenPriceMicro) / baseUnits;
  const premiumUsd = Number(premiumUsdMicro) / 1_000_000;
  if (!Number.isFinite(premiumUsd)) throw new Error("LENDER_PREMIUM_USD_OUT_OF_RANGE");

  return {
    candidate: {
      ...candidate,
      lenderPremiumUsd: premiumUsd,
      economicInputsVerified: true,
    },
    economics: {
      premiumBps: premium.premiumBps,
      premiumTokenUnits,
      premiumUsd,
      blockNumber: premium.blockNumber,
      sourceId: premium.sourceId,
    },
  };
}
