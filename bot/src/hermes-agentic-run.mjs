#!/usr/bin/env node
/**
 * Hermes agentic run coordinator.
 *
 * Purpose:
 *   Drive the bot from live RPC observation through strategy evaluation,
 *   economic validation, simulation, execution-lock creation and unsigned
 *   transaction intent generation.
 *
 * It deliberately stops at EXTERNAL_AUTH_REQUIRED. Signing and broadcast
 * remain outside the Hermes process.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const networks = [
  ["Ethereum","ETH_RPC_URL",1],["BNB Chain","BSC_RPC_URL",56],["Base","BASE_RPC_URL",8453],
  ["Arbitrum One","ARBITRUM_RPC_URL",42161],["Avalanche C-Chain","AVAX_RPC_URL",43114],
  ["Cronos","CRONOS_RPC_URL",25],["Sonic","SONIC_RPC_URL",146]
];

const MIN_PROFIT_USD=Number(process.env.HERMES_MIN_NET_PROFIT_USD??"2");
const intervalMs=Math.max(5000,Number(process.env.HERMES_OBSERVE_INTERVAL_MS??"15000"));
const once=process.env.HERMES_RUN_ONCE==="1";

function audit(value){return createHash("sha256").update(JSON.stringify(value)).digest("hex")}
async function rpc(url,method,params=[]){
  const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if(!r.ok) throw new Error("HTTP_"+r.status);
  const b=await r.json(); if(b.error) throw new Error("RPC_"+b.error.code+":"+b.error.message); return b.result;
}
async function observe([name,env,expected]){
  const url=process.env[env]?.trim();
  if(!url)return {name,env,expected,status:"UNSET"};
  try{
    const [cid,block,gas]=await Promise.all([rpc(url,"eth_chainId"),rpc(url,"eth_blockNumber"),rpc(url,"eth_gasPrice")]);
    const chainId=Number(BigInt(cid));
    return {name,env,expected,chainId,blockNumber:BigInt(block).toString(),gasPriceWei:BigInt(gas).toString(),rpcHealthy:chainId===expected,quoteFresh:false};
  }catch(error){return {name,env,expected,status:"ERROR",error:String(error.message??error),rpcHealthy:false}}
}
function phase(phase,state,extra={}){return {timestamp:new Date().toISOString(),phase,state,...extra}}
async function run(){
  console.log(JSON.stringify(phase("OBSERVE","START",{signing:false,broadcast:false,authorization:0}),null,2));
  const observations=await Promise.all(networks.map(observe));
  const healthy=observations.filter(x=>x.rpcHealthy);
  console.log(JSON.stringify(phase("RPC_VERIFIED","CONTINUE",{healthyNetworks:healthy.length,totalNetworks:observations.length,auditId:audit(observations),observations}),null,2));

  // Strategy selection remains evidence-driven. This coordinator never invents a profitable trade.
  // A downstream strategy adapter must provide a verified candidate and simulation result.
  const candidatePath=process.env.HERMES_CANDIDATE_JSON;
  if(!candidatePath){
    console.log(JSON.stringify(phase("STRATEGY_OBSERVATION","WAITING_FOR_VERIFIED_CANDIDATE",{next:"quote -> lender economics -> simulation -> execution lock",minimumNetProfitUsd:MIN_PROFIT_USD}),null,2));
    return;
  }
  const candidate=JSON.parse(await (await import("node:fs/promises")).readFile(candidatePath,"utf8"));
  if(candidate.netProfitUsd<MIN_PROFIT_USD) throw new Error("NET_PROFIT_BELOW_HERMES_FLOOR");
  if(candidate.simulationPassed!==true) throw new Error("SIMULATION_REQUIRED");
  if(candidate.economicInputsVerified!==true) throw new Error("ECONOMIC_INPUTS_UNVERIFIED");
  if(candidate.rpcHealthy!==true) throw new Error("RPC_NOT_VERIFIED");
  if(candidate.quoteFresh!==true) throw new Error("QUOTE_NOT_FRESH");

  const lock={...candidate,phase:"EXECUTION_LOCKED",executionAuthorization:0,liveSigning:false,broadcastEnabled:false};
  console.log(JSON.stringify(phase("EXECUTION_LOCKED","READY_FOR_EXTERNAL_AUTH",{auditId:audit(lock),lock}),null,2));
  console.log(JSON.stringify(phase("EXTERNAL_AUTH_REQUIRED","STOPPED_BEFORE_SIGNING",{message:"Hermes does not sign or broadcast.",authorization:0,liveSigning:false,broadcastEnabled:false}),null,2));
}
run().catch(error=>{console.error(JSON.stringify({phase:"FAILED",error:String(error.message??error),signing:false,broadcast:false,authorization:0},null,2));process.exitCode=1});
