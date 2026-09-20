#!/usr/bin/env node
const url = process.env.RPC_URL?.trim();
const expectedChainId = process.env.EXPECTED_CHAIN_ID?.trim();
if (!url) throw new Error("RPC_URL is required");
if (!expectedChainId) throw new Error("EXPECTED_CHAIN_ID is required");
async function rpc(method, params = []) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }) });
  if (!response.ok) throw new Error("HTTP_" + response.status + ":" + method);
  const payload = await response.json();
  if (payload.error) throw new Error("RPC_" + method + ":" + payload.error.code + ":" + payload.error.message);
  return payload.result;
}
const hexNumber = (value, label) => {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(label + "_INVALID");
  return BigInt(value);
};
const chainId = hexNumber(await rpc("eth_chainId"), "CHAIN_ID");
if (chainId !== BigInt(expectedChainId)) throw new Error("CHAIN_ID_MISMATCH:expected=" + expectedChainId + ":actual=" + chainId);
const blockHex = await rpc("eth_blockNumber");
const block = hexNumber(blockHex, "BLOCK_NUMBER");
const blockObject = await rpc("eth_getBlockByNumber", [blockHex, false]);
if (!blockObject || typeof blockObject !== "object") throw new Error("LATEST_BLOCK_INVALID");
const netVersion = await rpc("net_version");
hexNumber(await rpc("eth_gasPrice"), "GAS_PRICE");
const zero = "0x0000000000000000000000000000000000000000";
hexNumber(await rpc("eth_getBalance", [zero, "latest"]), "BALANCE");
if (typeof await rpc("eth_getCode", [zero, "latest"]) !== "string") throw new Error("CODE_INVALID");
if (typeof await rpc("eth_call", [{ to: zero, data: "0x" }, "latest"]) !== "string") throw new Error("ETH_CALL_RESULT_INVALID");
if (process.env.PROBE_ESTIMATE_GAS === "1") hexNumber(await rpc("eth_estimateGas", [{ from: zero, to: zero, data: "0x", value: "0x0" }]), "ESTIMATE_GAS");
const txHash = process.env.TX_HASH?.trim();
if (txHash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("TX_HASH_INVALID");
  const tx = await rpc("eth_getTransactionByHash", [txHash]);
  const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
  console.log("TX_LOOKUP: transaction=" + (tx ? "present" : "missing") + " receipt=" + (receipt ? "present" : "missing"));
}
console.log("RPC_OK chainId=" + chainId + " netVersion=" + netVersion + " latestBlock=" + block);
console.log("READ_ONLY=true");
console.log("NO_SIGNING=true");
console.log("NO_BROADCAST=true");
