import type { RpcTransport } from "./rpc-client.js";
import type { RouteCandidate, PlannedRoute, PlannerPolicy } from "./route-planner.js";
import { readChainState } from "./rpc-state.js";
import { applyLiveAaveV3LenderEconomics } from "./live-lender-economics.js";
import { planRouteWithExecutionEconomics, type ExecutableRouteContext } from "./execution-economics.js";
import { validateQuoteForRequest, type FreshQuote } from "./quote-provider.js";

export type EngagementObservation = {
  planned: PlannedRoute;
  blockNumber: bigint;
  blockTimestampMs: number;
  quoteBlockNumber?: bigint;
  lenderPremiumBlockNumber: bigint;
  quoteSourceId?: string;
  lenderSourceId: string;
};

/**
 * Builds one pinned, non-signing engagement observation. Quote, lender premium,
 * gas economics and profitability are evaluated against one chain-state block.
 */
export async function observeAaveEngagement(
  candidate: RouteCandidate,
  rpc: RpcTransport,
  executionRoute: ExecutableRouteContext,
  nativeUsdPrice: number,
  poolAddress: string,
  quote?: FreshQuote,
  policy: PlannerPolicy = {},
): Promise<EngagementObservation> {
  const state = await readChainState(candidate.chainId, {}, rpc);

  if (quote) {
    const firstLeg = candidate.legs[0];
    if (!firstLeg) throw new Error("ROUTE_REQUIRES_LEG");
    validateQuoteForRequest(
      { chainId: firstLeg.chainId, tokenIn: firstLeg.tokenIn, tokenOut: firstLeg.tokenOut, amountIn: firstLeg.amountIn },
      quote,
      state.blockTimestampMs,
    );
    if (quote.blockNumber !== undefined && quote.blockNumber !== state.blockNumber) {
      throw new Error("QUOTE_BLOCK_MISMATCH");
    }
  }

  const lender = await applyLiveAaveV3LenderEconomics(
    candidate,
    rpc,
    poolAddress,
    state.blockNumber,
  );

  const planned = await planRouteWithExecutionEconomics(
    lender.candidate,
    rpc,
    executionRoute,
    nativeUsdPrice,
    policy,
  );

  return {
    planned,
    blockNumber: state.blockNumber,
    blockTimestampMs: state.blockTimestampMs,
    quoteBlockNumber: quote?.blockNumber,
    lenderPremiumBlockNumber: lender.economics.blockNumber,
    quoteSourceId: quote?.sourceId,
    lenderSourceId: lender.economics.sourceId,
  };
}
