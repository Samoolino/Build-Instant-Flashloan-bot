import type { RpcTransport } from "./rpc-client.js";

export type Erc20Metadata = {
  address: string;
  decimals: number;
  symbol: string;
  balance: bigint;
};

const DECIMALS_SELECTOR = "0x313ce567";
const SYMBOL_SELECTOR = "0x95d89b41";
const BALANCE_OF_SELECTOR = "0x70a08231";

function addressWord(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("INVALID_TOKEN_ADDRESS");
  return address.slice(2).padStart(64, "0");
}

function parseUint256(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(value)) throw new Error(error);
  return BigInt(value);
}

function parseSymbol(value: string): string {
  if (!/^0x[0-9a-fA-F]*$/.test(value)) throw new Error("TOKEN_SYMBOL_INVALID");
  const hex = value.slice(2);
  if (hex.length === 0) throw new Error("TOKEN_SYMBOL_EMPTY");
  const bytes = Buffer.from(hex.padEnd(Math.ceil(hex.length / 2) * 2, "0"), "hex");
  const dynamicLength = bytes.length >= 32 ? Number(bytes.readUInt32BE(28)) : -1;
  let text: string;
  if (dynamicLength >= 0 && 32 + dynamicLength <= bytes.length) {
    text = bytes.subarray(32, 32 + dynamicLength).toString("utf8");
  } else {
    text = bytes.toString("utf8").replace(/\0+$/g, "");
  }
  if (!text.trim()) throw new Error("TOKEN_SYMBOL_EMPTY");
  return text.trim();
}

async function ethCall(rpc: RpcTransport, to: string, data: string): Promise<string> {
  const result = await rpc.request<string>("eth_call", [{ to, data }, "latest"]);
  if (typeof result !== "string") throw new Error("RPC_CALL_RESULT_INVALID");
  return result;
}

export async function readErc20Metadata(
  rpc: RpcTransport,
  tokenAddress: string,
  ownerAddress: string,
): Promise<Erc20Metadata> {
  const decimalsRaw = await ethCall(rpc, tokenAddress, DECIMALS_SELECTOR);
  const decimalsValue = parseUint256(decimalsRaw, "TOKEN_DECIMALS_INVALID");
  if (decimalsValue > 255n) throw new Error("TOKEN_DECIMALS_OUT_OF_RANGE");
  const symbolRaw = await ethCall(rpc, tokenAddress, SYMBOL_SELECTOR);
  const balanceRaw = await ethCall(rpc, tokenAddress, `${BALANCE_OF_SELECTOR}${addressWord(ownerAddress)}`);
  return {
    address: tokenAddress,
    decimals: Number(decimalsValue),
    symbol: parseSymbol(symbolRaw),
    balance: parseUint256(balanceRaw, "TOKEN_BALANCE_INVALID"),
  };
}
