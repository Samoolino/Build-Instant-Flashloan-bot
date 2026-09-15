import { asQuoteProvider, type FreshQuote } from "./quote-provider.js";
import type { QuoteRequest } from "./route-planner.js";
import { createJsonRpcTransport, type RpcTransport } from "./rpc-client.js";
import { readChainState } from "./rpc-state.js";

export type UniswapV3QuoteConfig = {
  chainId: number;
  quoterAddress: string;
  fee: number;
  rpcEnvVar?: string;
  sourceId?: string;
  maxQuoteAgeMs?: number;
  /** Required, independently verified total route gas cost in USD. */
  gasCostUsd: number;
  /** Required, independently verified lender premium cost in USD. */
  lenderPremiumUsd: number;
  /** Required, independently verified slippage reserve in USD. */
  slippageUsd: number;
};

const QUOTE_EXACT_INPUT_SINGLE_SELECTOR = "0xc6a5026a";
const ZERO_SQRT_PRICE_LIMIT = 0n;

function addressWord(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("INVALID_QUOTER_OR_TOKEN_ADDRESS");
  return address.slice(2).padStart(64, "0");
}

function uintWord(value: bigint): string {
  if (value < 0n || value >= (1n << 256n)) throw new Error("ABI_UINT256_OUT_OF_RANGE");
  return value.toString(16).padStart(64, "0");
}

function feeWord(fee: number): string {
  if (!Number.isInteger(fee) || fee < 0 || fee > 0xffffff) throw new Error("INVALID_UNISWAP_V3_FEE");
  return uintWord(BigInt(fee));
}

function validateUsdCost(value: number, error: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(error);
  const micro = Math.round(value * 1_000_000);
  if (!Number.isSafeInteger(micro)) throw new Error("USD_COST_REQUIRES_HIGH_PRECISION_INPUT");
  return micro / 1_000_000;
}

function parseAmountOut(result: string): bigint {
  if (!/^0x[0-9a-fA-F]*$/.test(result) || result.length < 66) throw new Error("UNISWAP_QUOTE_RESULT_INVALID");
  return BigInt(`0x${result.slice(2, 66)}`);
}

function buildQuoteCalldata(request: QuoteRequest, fee: number): string {
  return `${QUOTE_EXACT_INPUT_SINGLE_SELECTOR}${addressWord(request.tokenIn)}${addressWord(request.tokenOut)}${uintWord(request.amountIn)}${feeWord(fee)}${uintWord(ZERO_SQRT_PRICE_LIMIT)}`;
}

/** Reads a real Uniswap V3 QuoterV2 quote; it never signs or broadcasts. */
export function createUniswapV3QuoteProvider(
  config: UniswapV3QuoteConfig,
  env: NodeJS.ProcessEnv = process.env,
  rpc?: RpcTransport,
) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(config.quoterAddress)) throw new Error("INVALID_UNISWAP_QUOTER_ADDRESS");
  const rpcEnvVar = config.rpcEnvVar ?? "ETH_RPC_URL";
  const transport = rpc ?? createJsonRpcTransport({ sourceId: `${config.chainId}:uniswap-v3`, rpcEnvVar }, env);
  const sourceId = config.sourceId?.trim() || `uniswap-v3-quoter-v2:${config.chainId}`;
  const maxQuoteAgeMs = config.maxQuoteAgeMs ?? 5_000;
  const gasCostUsd = validateUsdCost(config.gasCostUsd, "ECONOMIC_GAS_COST_REQUIRED");
  const lenderPremiumUsd = validateUsdCost(config.lenderPremiumUsd, "ECONOMIC_LENDER_PREMIUM_REQUIRED");
  const slippageUsd = validateUsdCost(config.slippageUsd, "ECONOMIC_SLIPPAGE_RESERVE_REQUIRED");

  return {
    async quote(request: QuoteRequest): Promise<FreshQuote> {
      if (request.chainId !== config.chainId) throw new Error("QUOTE_CHAIN_MISMATCH");
      if (request.amountIn <= 0n) throw new Error("QUOTE_AMOUNT_IN_INVALID");
      const state = await readChainState(config.chainId, env, transport);
      const quotedAtMs = Date.now();
      const result = await transport.request<string>("eth_call", [
        { to: config.quoterAddress, data: buildQuoteCalldata(request, config.fee) },
        `0x${state.blockNumber.toString(16)}`,
      ]);
      const amountOut = parseAmountOut(result);
      return {
        amountOut,
        gasCostUsd,
        lenderPremiumUsd,
        swapFeeUsd: 0,
        slippageUsd,
        source: sourceId,
        sourceId,
        quotedAtMs,
        expiresAtMs: quotedAtMs + maxQuoteAgeMs,
        blockNumber: state.blockNumber,
      };
    },
  };
}

export function createPlannerCompatibleUniswapV3Provider(
  config: UniswapV3QuoteConfig,
  env: NodeJS.ProcessEnv = process.env,
  rpc?: RpcTransport,
) {
  return asQuoteProvider(createUniswapV3QuoteProvider(config, env, rpc));
}
