import { getCanonicalNetwork, type CanonicalNetwork } from "./network-config.js";
import { createJsonRpcTransport, getLatestBlockNumber, type RpcTransport } from "./rpc-client.js";

export type ChainState = {
  network: CanonicalNetwork;
  blockNumber: bigint;
  blockTimestampMs: number;
};

type BlockResponse = {
  timestamp?: string;
};

function parseHex(value: string, error: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(error);
  return BigInt(value);
}

export async function readChainState(
  chainId: number,
  env: NodeJS.ProcessEnv = process.env,
  rpc?: RpcTransport,
): Promise<ChainState> {
  const network = getCanonicalNetwork(chainId);
  const transport = rpc ?? createJsonRpcTransport({ sourceId: `${network.name}:rpc`, rpcEnvVar: network.rpcEnvVar }, env);
  const blockNumber = await getLatestBlockNumber(transport);
  const block = await transport.request<BlockResponse>("eth_getBlockByNumber", [`0x${blockNumber.toString(16)}`, false]);
  if (!block?.timestamp) throw new Error("RPC_BLOCK_TIMESTAMP_MISSING");
  const timestampSeconds = parseHex(block.timestamp, "RPC_BLOCK_TIMESTAMP_INVALID");
  const timestampMs = Number(timestampSeconds * 1000n);
  if (!Number.isSafeInteger(timestampMs)) throw new Error("RPC_BLOCK_TIMESTAMP_OUT_OF_RANGE");
  return { network, blockNumber, blockTimestampMs: timestampMs };
}
