import type { RpcTransport } from "./rpc-client.js";

export type GasEstimateRequest = {
  from: string;
  to: string;
  data?: string;
  valueWei?: bigint;
};

export type ExecutionEconomics = {
  gasLimit: bigint;
  gasPriceWei: bigint;
  nativeCostWei: bigint;
  nativeUsdPrice: number;
  gasCostUsd: number;
};

function addressWord(address: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("INVALID_GAS_ESTIMATE_ADDRESS");
}

function parseQuantity(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(error);
  return BigInt(value);
}

function usdMicro(value: number, error: string): bigint {
  if (!Number.isFinite(value) || value < 0) throw new Error(error);
  const scaled = Math.round(value * 1_000_000);
  if (!Number.isSafeInteger(scaled)) throw new Error("USD_PRICE_REQUIRES_HIGH_PRECISION_INPUT");
  return BigInt(scaled);
}

/** Estimates execution gas from the chain and converts the native cost to USD. No signing/broadcasting occurs. */
export async function estimateExecutionEconomics(
  rpc: RpcTransport,
  request: GasEstimateRequest,
  nativeUsdPrice: number,
): Promise<ExecutionEconomics> {
  addressWord(request.from);
  addressWord(request.to);
  const priceMicro = usdMicro(nativeUsdPrice, "INVALID_NATIVE_USD_PRICE");
  if (priceMicro === 0n) throw new Error("INVALID_NATIVE_USD_PRICE");

  const tx: Record<string, string> = { from: request.from, to: request.to };
  if (request.data !== undefined) {
    if (!/^0x[0-9a-fA-F]*$/.test(request.data)) throw new Error("INVALID_GAS_ESTIMATE_DATA");
    tx.data = request.data;
  }
  if (request.valueWei !== undefined) {
    if (request.valueWei < 0n || request.valueWei >= (1n << 256n)) throw new Error("INVALID_GAS_ESTIMATE_VALUE");
    tx.value = `0x${request.valueWei.toString(16)}`;
  }

  const [gasHex, gasPriceHex] = await Promise.all([
    rpc.request<string>("eth_estimateGas", [tx]),
    rpc.request<string>("eth_gasPrice", []),
  ]);
  const gasLimit = parseQuantity(gasHex, "RPC_GAS_ESTIMATE_INVALID");
  const gasPriceWei = parseQuantity(gasPriceHex, "RPC_GAS_PRICE_INVALID");
  if (gasLimit === 0n) throw new Error("RPC_GAS_ESTIMATE_ZERO");
  if (gasPriceWei === 0n) throw new Error("RPC_GAS_PRICE_ZERO");

  const nativeCostWei = gasLimit * gasPriceWei;
  const nativeUnits = 10n ** 18n;
  const gasCostUsdMicro = (nativeCostWei * priceMicro) / nativeUnits;
  const gasCostUsd = Number(gasCostUsdMicro) / 1_000_000;
  if (!Number.isFinite(gasCostUsd)) throw new Error("GAS_COST_USD_OUT_OF_RANGE");

  return { gasLimit, gasPriceWei, nativeCostWei, nativeUsdPrice, gasCostUsd };
}
