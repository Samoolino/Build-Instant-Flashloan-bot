import { evaluateNetProfitUsd, usdFloorToTokenUnits, MINIMUM_NET_PROFIT_USD } from "./profitability.js";
import { getCanonicalNetwork, type CanonicalNetwork } from "./network-config.js";

export type QuoteRequest = {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
};

export type Quote = {
  amountOut: bigint;
  gasCostUsd: number;
  lenderPremiumUsd: number;
  swapFeeUsd: number;
  slippageUsd: number;
  source: string;
};

export interface QuoteProvider {
  quote(request: QuoteRequest): Promise<Quote>;
}

export type RouteLeg = QuoteRequest & {
  minimumAmountOut: bigint;
  quoteSource: string;
};

export type RouteCandidate = {
  chainId: number;
  loanToken: string;
  loanAmount: bigint;
  tokenUsdPrice: number;
  tokenDecimals: number;
  lenderPremiumUsd: number;
  gasCostUsd: number;
  swapFeesUsd: number;
  slippageUsd: number;
  finalAmount: bigint;
  repaymentAmount: bigint;
  planHash: string;
  simulationPassed: boolean;
  legs: RouteLeg[];
};

export type PlannedRoute = {
  network: CanonicalNetwork;
  candidate: RouteCandidate;
  netProfitUsd: number;
  minimumProfitTokenUnits: bigint;
  decision: ReturnType<typeof evaluateNetProfitUsd>;
};

export type PlannerPolicy = {
  minimumNetProfitUsd?: number;
  requireSimulation?: boolean;
  requirePlanHash?: boolean;
  requireRepayment?: boolean;
};

const DEFAULT_POLICY: Required<PlannerPolicy> = {
  minimumNetProfitUsd: MINIMUM_NET_PROFIT_USD,
  requireSimulation: true,
  requirePlanHash: true,
  requireRepayment: true,
};

/** Builds a non-signing route decision from verified quote/simulation data. */
export function planRoute(candidate: RouteCandidate, policy: PlannerPolicy = {}): PlannedRoute {
  const effective = { ...DEFAULT_POLICY, ...policy };
  const network = getCanonicalNetwork(candidate.chainId);

  if (candidate.legs.length === 0) throw new Error("ROUTE_REQUIRES_LEG");
  if (effective.requireSimulation && !candidate.simulationPassed) throw new Error("SIMULATION_REQUIRED");
  if (effective.requirePlanHash && candidate.planHash.length === 0) throw new Error("PLAN_HASH_REQUIRED");
  if (effective.requireRepayment && candidate.repaymentAmount < candidate.loanAmount) throw new Error("REPAYMENT_UNSAFE");
  if (candidate.finalAmount < candidate.repaymentAmount) throw new Error("INSUFFICIENT_FINAL_BALANCE");

  const grossProfitToken = candidate.finalAmount - candidate.loanAmount;
  const grossProfitUsd = Number(grossProfitToken) / 10 ** candidate.tokenDecimals * candidate.tokenUsdPrice;
  const netProfitUsd = grossProfitUsd
    - candidate.lenderPremiumUsd
    - candidate.gasCostUsd
    - candidate.swapFeesUsd
    - candidate.slippageUsd;

  const decision = evaluateNetProfitUsd(netProfitUsd);
  const minimumProfitTokenUnits = usdFloorToTokenUnits(
    effective.minimumNetProfitUsd,
    candidate.tokenUsdPrice,
    candidate.tokenDecimals,
  );

  return { network, candidate, netProfitUsd, minimumProfitTokenUnits, decision };
}
