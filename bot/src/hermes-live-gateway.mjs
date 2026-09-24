#!/usr/bin/env node
/**
 * Hermes live gateway.
 *
 * This is an adapter boundary, not a key store. A separate signer service
 * receives the unsigned intent and returns a signed raw transaction.
 * The gateway only broadcasts a transaction after explicit environment gates.
 *
 * Required:
 *   HERMES_LIVE_EXECUTION=1
 *   HERMES_BROADCAST=1
 *   HERMES_EXTERNAL_SIGNER_URL
 *   HERMES_EXTERNAL_SIGNER_TOKEN
 *
 * The token is never printed.
 */
import { readFile } from "node:fs/promises";

const required = ["HERMES_EXTERNAL_SIGNER_URL", "HERMES_EXTERNAL_SIGNER_TOKEN"];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(key + "_REQUIRED");
}
if (process.env.HERMES_LIVE_EXECUTION !== "1") throw new Error("HERMES_LIVE_EXECUTION_NOT_ENABLED");
if (process.env.HERMES_BROADCAST !== "1") throw new Error("HERMES_BROADCAST_NOT_ENABLED");

const intentPath = process.env.HERMES_INTENT_JSON;
if (!intentPath) throw new Error("HERMES_INTENT_JSON_REQUIRED");
const intent = JSON.parse(await readFile(intentPath, "utf8"));

const signerResponse = await fetch(process.env.HERMES_EXTERNAL_SIGNER_URL, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "authorization": "Bearer " + process.env.HERMES_EXTERNAL_SIGNER_TOKEN,
  },
  body: JSON.stringify({ intent }),
});
if (!signerResponse.ok) throw new Error("EXTERNAL_SIGNER_HTTP_" + signerResponse.status);
const signed = await signerResponse.json();
if (typeof signed.rawTransaction !== "string" || !/^0x[0-9a-fA-F]+$/.test(signed.rawTransaction)) {
  throw new Error("INVALID_EXTERNAL_SIGNER_RESPONSE");
}

const rpcUrl = process.env.HERMES_BROADCAST_RPC_URL;
if (!rpcUrl) throw new Error("HERMES_BROADCAST_RPC_URL_REQUIRED");

const rpc = await fetch(rpcUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_sendRawTransaction",
    params: [signed.rawTransaction],
  }),
});
if (!rpc.ok) throw new Error("BROADCAST_HTTP_" + rpc.status);
const body = await rpc.json();
if (body.error) throw new Error("BROADCAST_RPC_" + body.error.code + ":" + body.error.message);
console.log(JSON.stringify({ stage: "BROADCAST", transactionHash: body.result, signing: "EXTERNAL", credentialsExposed: false }));
