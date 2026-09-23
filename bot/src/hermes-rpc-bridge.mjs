#!/usr/bin/env node
/**
 * Hermes read-only live RPC bridge.
 * Credentials are read from the existing environment; values are never returned.
 * This bridge performs no signing and no transaction broadcast.
 */
const networks = [
  ["Ethereum","ETH_RPC_URL",1],["BNB Chain","BSC_RPC_URL",56],["Base","BASE_RPC_URL",8453],
  ["Arbitrum One","ARBITRUM_RPC_URL",42161],["Avalanche C-Chain","AVAX_RPC_URL",43114],
  ["Cronos","CRONOS_RPC_URL",25],["Sonic","SONIC_RPC_URL",146]
];
async function rpc(url,method,params=[]){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});if(!r.ok)throw new Error("HTTP_"+r.status);const b=await r.json();if(b.error)throw new Error("RPC_"+b.error.code+":"+b.error.message);return b.result}
async function main(){const rows=[];for(const [name,env,expected] of networks){const url=process.env[env]?.trim();if(!url){rows.push({name,env,status:"UNSET"});continue}try{const chainId=Number(BigInt(await rpc(url,"eth_chainId")));const block=await rpc(url,"eth_blockNumber");const gas=await rpc(url,"eth_gasPrice");rows.push({name,env,expectedChainId:expected,chainId,blockNumber:BigInt(block).toString(),gasPriceWei:BigInt(gas).toString(),status:chainId===expected?"PASS":"CHAIN_ID_MISMATCH"})}catch(e){rows.push({name,env,status:"ERROR",error:String(e.message??e)})}}console.log(JSON.stringify({readOnly:true,signing:false,broadcast:false,networks:rows},null,2))}
main().catch(e=>{console.error(e);process.exit(1)});
