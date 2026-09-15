import assert from "node:assert/strict";
import test from "node:test";
import { createUniswapV3QuoteProvider } from "./uniswap-v3-quote.js";

const quoter = "0x1111111111111111111111111111111111111111";
const tokenIn = "0x2222222222222222222222222222222222222222";
const tokenOut = "0x3333333333333333333333333333333333333333";
const economics = { gasCostUsd: 0.25, lenderPremiumUsd: 0.09, slippageUsd: 0.05 };

test("reads a block-pinned Uniswap V3 quote and preserves bigint output", async () => {
  const methods: string[] = [];
  const rpc = {
    async request<T>(method: string, params: readonly unknown[] = []): Promise<T> {
      methods.push(method);
      if (method === "eth_blockNumber") return "0x10" as T;
      if (method === "eth_getBlockByNumber") return { timestamp: "0x65" } as T;
      if (method === "eth_call") {
        const call = params[0] as { to: string; data: string };
        assert.equal(call.to, quoter);
        assert.equal(call.data.length, 2 + 8 + 32 * 5);
        assert.equal(params[1], "0x10");
        return `0x${(12345678901234567890n).toString(16).padStart(64, "0")}` as T;
      }
      throw new Error(`UNEXPECTED_METHOD:${method}`);
    },
  };

  const provider = createUniswapV3QuoteProvider(
    { chainId: 1, quoterAddress: quoter, fee: 3000, maxQuoteAgeMs: 5000, ...economics },
    {},
    rpc,
  );
  const quote = await provider.quote({ chainId: 1, tokenIn, tokenOut, amountIn: 1_000_000n });
  assert.equal(quote.amountOut, 12345678901234567890n);
  assert.equal(quote.blockNumber, 16n);
  assert.equal(quote.sourceId, "uniswap-v3-quoter-v2:1");
  assert.equal(quote.gasCostUsd, economics.gasCostUsd);
  assert.equal(quote.lenderPremiumUsd, economics.lenderPremiumUsd);
  assert.equal(quote.slippageUsd, economics.slippageUsd);
  assert.deepEqual(methods, ["eth_blockNumber", "eth_getBlockByNumber", "eth_call"]);
});

test("rejects requests for a different chain", async () => {
  const provider = createUniswapV3QuoteProvider(
    { chainId: 1, quoterAddress: quoter, fee: 3000, ...economics },
    {},
    { request: async <T>() => "0x0" as T },
  );
  await assert.rejects(
    () => provider.quote({ chainId: 56, tokenIn, tokenOut, amountIn: 1n }),
    /QUOTE_CHAIN_MISMATCH/,
  );
});

test("rejects missing economic inputs before any RPC call", () => {
  assert.throws(
    () => createUniswapV3QuoteProvider(
      { chainId: 1, quoterAddress: quoter, fee: 3000, lenderPremiumUsd: 0, slippageUsd: 0 } as never,
      {},
      { request: async <T>() => "0x0" as T },
    ),
    /ECONOMIC_GAS_COST_REQUIRED/,
  );
});

test("rejects invalid economic inputs before any RPC call", () => {
  assert.throws(
    () => createUniswapV3QuoteProvider(
      { chainId: 1, quoterAddress: quoter, fee: 3000, gasCostUsd: -1, lenderPremiumUsd: 0, slippageUsd: 0 },
      {},
      { request: async <T>() => "0x0" as T },
    ),
    /ECONOMIC_GAS_COST_REQUIRED/,
  );
});
