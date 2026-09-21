#!/usr/bin/env node
/**
 * Real, read-only RPC validation.
 * Fails closed if any required network variable is missing.
 * Never signs or broadcasts a transaction.
 */
const networks = [
  ["Ethereum", "ETH_RPC_URL", 1],
  ["BNB Chain", "BSC_RPC_URL", 56],
  ["Base", "BASE_RPC_URL", 8453],
  ["Arbitrum One", "ARBITRUM_RPC_URL", 42161],
  ["Avalanche C-Chain", "AVAX_RPC_URL", 43114],
  ["Cronos", "CRONOS_RPC_URL", 25],
  ["Sonic", "SONIC_RPC_URL", 146],
];
const zeroAddress = "0x0000000000000000000000000000000000000000";
const zeroHash = "0x" + "00".repeat(32);
const calls = [
  ["eth_blockNumber", []],
  ["eth_getBlockByNumber", ["latest", false]],
  ["eth_gasPrice", []],
  ["eth_getBalance", [zeroAddress, "latest"]],
  ["eth_getCode", [zeroAddress, "latest"]],
  ["eth_call", [{to: zeroAddress, data: "0x"}, "latest"]],
  ["eth_estimateGas", [{from: zeroAddress, to: zeroAddress, value: "0x0", data: "0x"}]],
  ["eth_getTransactionByHash", [zeroHash]],
  ["eth_getTransactionReceipt", [zeroHash]],
  ["net_version", []],
];
async function rpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params}),
  });
  if (!response.ok) throw new Error("HTTP_" + response.status + ":" + method);
  const body = await response.json();
  if (body.error) throw new Error("RPC_" + method + ":" + body.error.code + ":" + body.error.message);
  return body.result;
}
let failures = 0;
for (const [name, envVar, expectedChainId] of networks) {
  const url = process.env[envVar]?.trim();
  if (!url) {
    failures++;
    console.error("FAIL " + name + ": " + envVar + " is unset");
    continue;
  }
  try {
    const chainHex = await rpc(url, "eth_chainId", []);
    const chainId = Number(BigInt(chainHex));
    if (chainId !== expectedChainId) {
      throw new Error("CHAIN_ID_MISMATCH:expected=" + expectedChainId + ":actual=" + chainId);
    }
    for (const [method, params] of calls) await rpc(url, method, params);
    console.log("PASS " + name + " chainId=" + chainId + " rpc_requests=" + (calls.length + 1));
  } catch (error) {
    failures++;
    console.error("FAIL " + name + ": " + error.message);
  }
}
if (failures) {
  console.error("REAL_RPC_REQUEST_MATRIX_COMPLETE=false");
  process.exit(1);
}
console.log("REAL_RPC_REQUEST_MATRIX_COMPLETE=true");
console.log("NETWORKS_TESTED=" + networks.length);
console.log("READ_ONLY=true");
console.log("SIGNING=false");
console.log("BROADCAST=false");
