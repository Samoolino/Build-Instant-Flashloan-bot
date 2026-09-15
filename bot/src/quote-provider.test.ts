import assert from "node:assert/strict";
import test from "node:test";
import { validateQuoteForRequest, type FreshQuote } from "./quote-provider.js";

const request = {
  chainId: 1,
  tokenIn: "0x0000000000000000000000000000000000000001",
  tokenOut: "0x0000000000000000000000000000000000000002",
  amountIn: 1_000_000n,
};

function quote(overrides: Partial<FreshQuote> = {}): FreshQuote {
  return {
    amountOut: 1_010_000n,
    gasCostUsd: 0.25,
    lenderPremiumUsd: 0.09,
    swapFeeUsd: 0.1,
    slippageUsd: 0.05,
    source: "test-source",
    sourceId: "test-source",
    quotedAtMs: 1_000,
    expiresAtMs: 4_000,
    ...overrides,
  };
}

test("accepts a fresh, unexpired quote", () => {
  assert.doesNotThrow(() => validateQuoteForRequest(request, quote(), 2_000));
});

test("rejects a stale quote", () => {
  assert.throws(() => validateQuoteForRequest(request, quote(), 7_000), /QUOTE_STALE/);
});

test("rejects an expired quote even when age is within the freshness window", () => {
  assert.throws(() => validateQuoteForRequest(request, quote({ expiresAtMs: 2_500 }), 3_000), /QUOTE_EXPIRED/);
});

test("rejects a future-dated quote", () => {
  assert.throws(() => validateQuoteForRequest(request, quote({ quotedAtMs: 2_001 }), 2_000), /QUOTE_FROM_FUTURE/);
});

test("rejects invalid expiry and missing source identity", () => {
  assert.throws(() => validateQuoteForRequest(request, quote({ expiresAtMs: 1_000 }), 1_000), /QUOTE_EXPIRY_INVALID/);
  assert.throws(() => validateQuoteForRequest(request, quote({ sourceId: "" }), 2_000), /QUOTE_SOURCE_REQUIRED/);
});

test("rejects zero output and negative economic costs", () => {
  assert.throws(() => validateQuoteForRequest(request, quote({ amountOut: 0n }), 2_000), /QUOTE_AMOUNT_OUT_ZERO/);
  assert.throws(() => validateQuoteForRequest(request, quote({ gasCostUsd: -1 }), 2_000), /QUOTE_COST_INVALID/);
});
