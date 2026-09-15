export type RpcTransport = {
  request<T>(method: string, params: readonly unknown[]): Promise<T>;
};

export type JsonRpcQuoteSource = {
  sourceId: string;
  rpcEnvVar: string;
};

export function createJsonRpcTransport(
  source: JsonRpcQuoteSource,
  env: NodeJS.ProcessEnv = process.env,
): RpcTransport {
  const endpoint = env[source.rpcEnvVar]?.trim();
  if (!endpoint) throw new Error(`RPC_ENDPOINT_REQUIRED:${source.rpcEnvVar}`);

  return {
    async request<T>(method: string, params: readonly unknown[]): Promise<T> {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!response.ok) throw new Error(`RPC_HTTP_ERROR:${response.status}`);
      const payload = (await response.json()) as { result?: T; error?: { code: number; message: string } };
      if (payload.error) throw new Error(`RPC_ERROR:${payload.error.code}:${payload.error.message}`);
      if (!("result" in payload)) throw new Error("RPC_RESULT_MISSING");
      return payload.result as T;
    },
  };
}

export async function getLatestBlockNumber(rpc: RpcTransport): Promise<bigint> {
  const hex = await rpc.request<string>("eth_blockNumber", []);
  if (!/^0x[0-9a-fA-F]+$/.test(hex)) throw new Error("RPC_BLOCK_NUMBER_INVALID");
  return BigInt(hex);
}
