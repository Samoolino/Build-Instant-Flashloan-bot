import type { RpcTransport } from "./rpc-client.js";

export type AavePremium = {
  poolAddress: string;
  premiumBps: bigint;
  premiumRate: number;
  blockNumber: bigint;
  sourceId: string;
};

const SELECTOR = "0x3b7b6c8e";

function address(value: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("INVALID_AAVE_POOL_ADDRESS");
}

function quantity(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(error);
  return BigInt(value);
}

/** Reads the Aave V3 flash-loan premium from the live pool. No signing or broadcasting occurs. */
export async function readAaveV3FlashLoanPremium(
  rpc: RpcTransport,
  poolAddress: string,
  blockNumber: bigint,
  sourceId = "aave-v3:flashloan-premium",
): Promise<AavePremium> {
  address(poolAddress);
  if (blockNumber < 0n) throw new Error("INVALID_AAVE_PREMIUM_BLOCK");
  const result = await rpc.request<string>("eth_call", [{ to: poolAddress, data: SELECTOR }, `0x${blockNumber.toString(16)}`]);
  const premiumBps = quantity(result, "AAVE_PREMIUM_RESULT_INVALID");
  if (premiumBps > 10_000n) throw new Error("AAVE_PREMIUM_OUT_OF_RANGE");
  return {
    poolAddress,
    premiumBps,
    premiumRate: Number(premiumBps) / 10_000,
    blockNumber,
    sourceId,
  };
}
