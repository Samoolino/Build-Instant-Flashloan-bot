#!/usr/bin/env node
/**
 * Full Hermes live corridor.
 *
 * The unsigned intent is produced by the deterministic lock/MCP layer.
 * This runner only proceeds when explicit live gates and an external signer
 * are configured. It never receives, derives, stores, or prints a private key.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const required = ["HERMES_INTENT_JSON","HERMES_BROADCAST_RPC_URL","HERMES_EXTERNAL_SIGNER_URL","HERMES_EXTERNAL_SIGNER_TOKEN"];
for (const key of required) if (!process.env[key]?.trim()) throw new Error(key + "_REQUIRED");
if (process.env.HERMES_LIVE_EXECUTION !== "1") throw new Error("HERMES_LIVE_EXECUTION_NOT_ENABLED");
if (process.env.HERMES_BROADCAST !== "1") throw new Error("HERMES_BROADCAST_NOT_ENABLED");

const intent = JSON.parse(await readFile(process.env.HERMES_INTENT_JSON, "utf8"));
const predictedProfitUsd = Number(intent.predictedProfitUsd ?? process.env.HERMES_PREDICTED_PROFIT_USD);
if (!Number.isFinite(predictedProfitUsd)) throw new Error("PREDICTED_PROFIT_REQUIRED");
if (intent.executionAuthorization !== 0 || intent.liveSigning !== false || intent.broadcastEnabled !== false) {
  throw new Error("INTENT_POLICY_VIOLATION");
}
if (Date.now() >= Number(intent.expiresAtMs)) throw new Error("SIGNER_INTENT_EXPIRED");

async function rpc(method, params = []) {
  const r = await fetch(process.env.HERMES_BROADCAST_RPC_URL, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({jsonrpc:"2.0",id:1,method,params}),
  });
  if (!r.ok) throw new Error("RPC_HTTP_" + r.status);
  const body = await r.json();
  if (body.error) throw new Error("RPC_" + body.error.code + ":" + body.error.message);
  return body.result;
}

const signer = await fetch(process.env.HERMES_EXTERNAL_SIGNER_URL, {
  method:"POST",
  headers:{
    "content-type":"application/json",
    "authorization":"Bearer " + process.env.HERMES_EXTERNAL_SIGNER_TOKEN,
  },
  body:JSON.stringify({intent}),
});
if (!signer.ok) throw new Error("EXTERNAL_SIGNER_HTTP_" + signer.status);
const signed = await signer.json();
if (typeof signed.rawTransaction !== "string" || !/^0x[0-9a-fA-F]+$/.test(signed.rawTransaction)) {
  throw new Error("INVALID_EXTERNAL_SIGNER_RESPONSE");
}

const txHash = await rpc("eth_sendRawTransaction", [signed.rawTransaction]);
if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("INVALID_TRANSACTION_HASH");

const timeoutMs = Math.max(5_000, Number(process.env.HERMES_RECEIPT_TIMEOUT_MS ?? "180000"));
const pollMs = Math.max(250, Number(process.env.HERMES_RECEIPT_POLL_MS ?? "2000"));
const started = Date.now();
let receipt;
while (Date.now() - started < timeoutMs) {
  receipt = await rpc("eth_getTransactionReceipt", [txHash]);
  if (receipt) break;
  await new Promise(resolve => setTimeout(resolve, pollMs));
}
if (!receipt) throw new Error("RECEIPT_TIMEOUT");
if (String(receipt.status) !== "0x1" && String(receipt.status) !== "0x01") throw new Error("TRANSACTION_REVERTED");

let realizedProfitUsd;
const observerUrl = process.env.HERMES_PROFIT_OBSERVER_URL;
if (observerUrl) {
  const observed = await fetch(observerUrl, {
    method:"POST",
    headers:{"content-type":"application/json","authorization":"Bearer " + process.env.HERMES_EXTERNAL_SIGNER_TOKEN},
    body:JSON.stringify({intent,txHash,receipt}),
  });
  if (!observed.ok) throw new Error("PROFIT_OBSERVER_HTTP_" + observed.status);
  const data = await observed.json();
  realizedProfitUsd = Number(data.realizedProfitUsd);
} else {
  throw new Error("HERMES_PROFIT_OBSERVER_URL_REQUIRED");
}
if (!Number.isFinite(realizedProfitUsd)) throw new Error("INVALID_REALIZED_PROFIT");

const feedback = {
  predictedProfitUsd,
  realizedProfitUsd,
  varianceUsd: realizedProfitUsd - predictedProfitUsd,
  status: realizedProfitUsd >= 2 ? "PROFIT_CONFIRMED" : "PROFIT_MISSED",
};
const auditId = createHash("sha256").update(JSON.stringify({intent,txHash,receipt,feedback})).digest("hex");

console.log(JSON.stringify({
  phase:"AGENTIC_FEEDBACK",
  observationId:intent.observationId,
  planHash:intent.planHash,
  transactionHash:txHash,
  receiptStatus:receipt.status,
  feedback,
  auditId,
  signer:"EXTERNAL",
  credentialsExposed:false,
}, null, 2));
