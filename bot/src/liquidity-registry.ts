import { getCanonicalNetwork, type CanonicalNetwork } from "./network-config.js";

export type RegistryEntry = {
  id: string;
  name: string;
  kind: "LENDER" | "DEX";
  chainId: number;
  addressEnvVar: string;
  enabledEnvVar: string;
};

export const LENDER_REGISTRY: readonly RegistryEntry[] = Object.freeze([
  { id: "aave-v3", name: "Aave V3", kind: "LENDER", chainId: 1, addressEnvVar: "AAVE_V3_POOL_ETHEREUM", enabledEnvVar: "AAVE_V3_ENABLED_ETHEREUM" },
  { id: "aave-v3", name: "Aave V3", kind: "LENDER", chainId: 56, addressEnvVar: "AAVE_V3_POOL_BSC", enabledEnvVar: "AAVE_V3_ENABLED_BSC" },
  { id: "aave-v3", name: "Aave V3", kind: "LENDER", chainId: 8453, addressEnvVar: "AAVE_V3_POOL_BASE", enabledEnvVar: "AAVE_V3_ENABLED_BASE" },
  { id: "aave-v3", name: "Aave V3", kind: "LENDER", chainId: 42161, addressEnvVar: "AAVE_V3_POOL_ARBITRUM", enabledEnvVar: "AAVE_V3_ENABLED_ARBITRUM" },
  { id: "aave-v3", name: "Aave V3", kind: "LENDER", chainId: 43114, addressEnvVar: "AAVE_V3_POOL_AVALANCHE", enabledEnvVar: "AAVE_V3_ENABLED_AVALANCHE" },
  { id: "aave-v3", name: "Aave V3", kind: "LENDER", chainId: 25, addressEnvVar: "AAVE_V3_POOL_CRONOS", enabledEnvVar: "AAVE_V3_ENABLED_CRONOS" },
  { id: "aave-v3", name: "Aave V3", kind: "LENDER", chainId: 146, addressEnvVar: "AAVE_V3_POOL_SONIC", enabledEnvVar: "AAVE_V3_ENABLED_SONIC" },
]);

export const DEX_REGISTRY: readonly RegistryEntry[] = Object.freeze([
  { id: "uniswap-v3", name: "Uniswap V3", kind: "DEX", chainId: 1, addressEnvVar: "UNISWAP_V3_ROUTER_ETHEREUM", enabledEnvVar: "UNISWAP_V3_ENABLED_ETHEREUM" },
  { id: "uniswap-v3", name: "Uniswap V3", kind: "DEX", chainId: 8453, addressEnvVar: "UNISWAP_V3_ROUTER_BASE", enabledEnvVar: "UNISWAP_V3_ENABLED_BASE" },
  { id: "uniswap-v3", name: "Uniswap V3", kind: "DEX", chainId: 42161, addressEnvVar: "UNISWAP_V3_ROUTER_ARBITRUM", enabledEnvVar: "UNISWAP_V3_ENABLED_ARBITRUM" },
  { id: "sushi-v2", name: "Sushi V2", kind: "DEX", chainId: 1, addressEnvVar: "SUSHI_V2_ROUTER_ETHEREUM", enabledEnvVar: "SUSHI_V2_ENABLED_ETHEREUM" },
  { id: "sushi-v2", name: "Sushi V2", kind: "DEX", chainId: 56, addressEnvVar: "SUSHI_V2_ROUTER_BSC", enabledEnvVar: "SUSHI_V2_ENABLED_BSC" },
  { id: "sushi-v2", name: "Sushi V2", kind: "DEX", chainId: 8453, addressEnvVar: "SUSHI_V2_ROUTER_BASE", enabledEnvVar: "SUSHI_V2_ENABLED_BASE" },
  { id: "sushi-v2", name: "Sushi V2", kind: "DEX", chainId: 42161, addressEnvVar: "SUSHI_V2_ROUTER_ARBITRUM", enabledEnvVar: "SUSHI_V2_ENABLED_ARBITRUM" },
]);

export function registryForNetwork(
  registry: readonly RegistryEntry[],
  chainId: number,
): readonly RegistryEntry[] {
  getCanonicalNetwork(chainId);
  return registry.filter((entry) => entry.chainId === chainId);
}

export function configuredRegistryEntries(
  registry: readonly RegistryEntry[],
  chainId: number,
  env: NodeJS.ProcessEnv = process.env,
): readonly RegistryEntry[] {
  return registryForNetwork(registry, chainId).filter((entry) => {
    return env[entry.addressEnvVar]?.trim() !== "" && env[entry.enabledEnvVar] === "true";
  });
}

export function requireCanonicalNetwork(chainId: number): CanonicalNetwork {
  return getCanonicalNetwork(chainId);
}
