export type CanonicalNetwork = {
  name: string;
  chainId: number;
  nativeSymbol: string;
  rpcEnvVar: string;
};

export const CANONICAL_NETWORKS = Object.freeze([
  { name: "Ethereum", chainId: 1, nativeSymbol: "ETH", rpcEnvVar: "ETH_RPC_URL" },
  { name: "BNB Chain", chainId: 56, nativeSymbol: "BNB", rpcEnvVar: "BSC_RPC_URL" },
  { name: "Base", chainId: 8453, nativeSymbol: "ETH", rpcEnvVar: "BASE_RPC_URL" },
  { name: "Arbitrum One", chainId: 42161, nativeSymbol: "ETH", rpcEnvVar: "ARBITRUM_RPC_URL" },
  { name: "Avalanche C-Chain", chainId: 43114, nativeSymbol: "AVAX", rpcEnvVar: "AVAX_RPC_URL" },
  { name: "Cronos", chainId: 25, nativeSymbol: "CRO", rpcEnvVar: "CRONOS_RPC_URL" },
  { name: "Sonic", chainId: 146, nativeSymbol: "S", rpcEnvVar: "SONIC_RPC_URL" },
] as const satisfies readonly CanonicalNetwork[]);

export function getCanonicalNetwork(chainId: number): CanonicalNetwork {
  const network = CANONICAL_NETWORKS.find((candidate) => candidate.chainId === chainId);
  if (!network) throw new Error(`UNSUPPORTED_CANONICAL_CHAIN:${chainId}`);
  return network;
}

export function isCanonicalChain(chainId: number): boolean {
  return CANONICAL_NETWORKS.some((candidate) => candidate.chainId === chainId);
}
