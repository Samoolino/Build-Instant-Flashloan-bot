import type { Quote, QuoteProvider, QuoteRequest } from "./route-planner.js";

export type QuoteMetadata = {
  sourceId: string;
  quotedAtMs: number;
  expiresAtMs: number;
  blockNumber?: bigint;
};

export type FreshQuote = Quote & QuoteMetadata;

export type QuoteProviderWithMetadata = {
  quote(request: QuoteRequest): Promise<FreshQuote>;
};

export const DEFAULT_MAX_QUOTE_AGE_MS = 5_000;

export function validateQuoteFreshness(
  quote: FreshQuote,
  nowMs: number = Date.now(),
  maxAgeMs: number = DEFAULT_MAX_QUOTE_AGE_MS,
): void {
  if (!quote.sourceId.trim()) throw new Error("QUOTE_SOURCE_REQUIRED");
  if (!Number.isFinite(quote.quotedAtMs) || !Number.isFinite(quote.expiresAtMs)) {
    throw new Error("QUOTE_TIMESTAMP_INVALID");
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("QUOTE_NOW_INVALID");
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) throw new Error("QUOTE_MAX_AGE_INVALID");
  if (quote.expiresAtMs <= quote.quotedAtMs) throw new Error("QUOTE_EXPIRY_INVALID");
  if (quote.quotedAtMs > nowMs) throw new Error("QUOTE_FROM_FUTURE");
  if (nowMs - quote.quotedAtMs > maxAgeMs) throw new Error("QUOTE_STALE");
  if (nowMs >= quote.expiresAtMs) throw new Error("QUOTE_EXPIRED");
}

export function validateQuoteForRequest(
  request: QuoteRequest,
  quote: FreshQuote,
  nowMs: number = Date.now(),
  maxAgeMs: number = DEFAULT_MAX_QUOTE_AGE_MS,
): FreshQuote {
  if (quote.amountOut < 0n) throw new Error("QUOTE_AMOUNT_OUT_INVALID");
  if (quote.amountOut === 0n) throw new Error("QUOTE_AMOUNT_OUT_ZERO");
  if (quote.gasCostUsd < 0 || quote.lenderPremiumUsd < 0 || quote.swapFeeUsd < 0 || quote.slippageUsd < 0) {
    throw new Error("QUOTE_COST_INVALID");
  }
  validateQuoteFreshness(quote, nowMs, maxAgeMs);
  return quote;
}

/** Adapts a metadata-aware provider to the planner's basic QuoteProvider contract. */
export function asQuoteProvider(provider: QuoteProviderWithMetadata): QuoteProvider {
  return {
    async quote(request: QuoteRequest): Promise<Quote> {
      return validateQuoteForRequest(request, await provider.quote(request));
    },
  };
}
