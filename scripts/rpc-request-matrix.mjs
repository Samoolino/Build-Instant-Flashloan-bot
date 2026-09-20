#!/usr/bin/env node
const networks = [
  ["Ethereum", "ETH_RPC_URL", 1],
  ["BNB Chain", "BSC_RPC_URL", 56],
  ["Base", "BASE_RPC_URL", 8453],
  ["Arbitrum One", "ARBITRUM_RPC_URL", 42161],
  ["Avalanche C-Chain", "AVAX_RPC_URL", 43114],
  ["Cronos", "CRONOS_RPC_URL", 25],
  ["Sonic", "SONIC_RPC_URL", 146],
];
const calls = [
  ["eth_blockNumber", []],
  ["eth_getBlockByNumber", ["latest", false]],
  ["eth_gasPrice", []],
  ["eth_getBalance", ["0x0000000000000000000000000000000000000000", "latest"]],
  ["eth_getCode", ["0x0000000000000000000000000000000000000000", "latest"]],
  ["eth_call", [{to:"0x0000000000000000000000000000000000000000",data:"0x"}, "latest"]],
  ["eth_estimateGas", [{from:"0x0000000000000000000000000000000000000000",to:"0x0000000000000000000000000000000000000000",data:"0x",value:"0x0"}]],
  ["eth_getTransactionByHash", ["0x"+"00".repeat(32)]],
  ["eth_getTransactionReceipt", ["0x"+"00".repeat(32)]],
  ["net_version", []],
];
async function rpc(url, method, params) {
  const res = await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if (!res.ok) throw new Error("HTTP_"+res.status+":"+method);
  const body = await res.json();
  if (body.error) throw new Error("RPC_"+method+":"+body.error.code+":"+body.error.message);
  return body.result;
}
let failures=0;
for (const [name, envVar, expected] of networks) {
  const url=process.env[envVar]?.trim();
  if (!url) { console.log("SKIP "+name+": "+envVar+" unset"); continue; }
  try {
    const chainHex=await rpc(url,"eth_chainId",[]);
    const chain=Number(BigInt(chainHex));
    if (chain!==expected) throw new Error("CHAIN_ID_MISMATCH:expected="+expected+":actual="+chain);
    for (const [method,params] of calls) await rpc(url,method,params);
    console.log("PASS "+name+" chainId="+chain);
  } catch(err) {
    failures++;
    console.error("FAIL "+name+": "+err.message);
  }
}
if(failures) process.exit(1);
console.log("REAL_RPC_REQUEST_MATRIX_COMPLETE=true");
console.log("READ_ONLY=true");
console.log("SIGNING=false");
console.log("BROADCAST=false");
