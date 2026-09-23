#!/usr/bin/env node

const NETWORKS = [
  ["Ethereum", "ETH_RPC_URL", 1],
  ["BNB Chain", "BSC_RPC_URL", 56],
  ["Base", "BASE_RPC_URL", 8453],
  ["Arbitrum One", "ARBITRUM_RPC_URL", 42161],
  ["Avalanche C-Chain", "AVAX_RPC_URL", 43114],
  ["Cronos", "CRONOS_RPC_URL", 25],
  ["Sonic", "SONIC_RPC_URL", 146],
];

const timeoutMs = Number(process.env.RPC_TIMEOUT_MS || 8000);

function fail(message) {
  console.error("RPC_MATRIX_FAILED");
  console.error(message);
  process.exit(1);
}

function requireUrl(name, value) {
  if (!value) fail(`${name}: not configured`);
  if (/\$\{|YOUR_|PASTE_YOUR_|replace_with_|\$ALCHEMY_API_KEY/i.test(value)) {
    fail(`${name}: placeholder or unevaluated environment expression`);
  }
  try {
    new URL(value);
  } catch {
    fail(`${name}: invalid URL`);
  }
}

async function rpc(url, method, params = []) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const payload = await response.json();
    if (payload.error) {
      throw new Error(`RPC_${payload.error.code || "ERROR"}:${payload.error.message || "unknown"}`);
    }
    return { result: payload.result, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

const rows = [];
let failed = false;

for (const [name, env, expectedChainId] of NETWORKS) {
  const url = process.env[env]?.trim();
  const row = { name, env, expectedChainId, status: "unknown" };
  try {
    requireUrl(env, url);
    const chain = await rpc(url, "eth_chainId");
    if (typeof chain.result !== "string" || !/^0x[0-9a-f]+$/i.test(chain.result)) {
      throw new Error("CHAIN_ID_INVALID");
    }
    const chainId = Number(BigInt(chain.result));
    row.chainId = chainId;
    row.latencyMs = chain.latencyMs;
    if (chainId !== expectedChainId) {
      row.status = "chain_mismatch";
      failed = true;
      rows.push(row);
      continue;
    }

    const block = await rpc(url, "eth_blockNumber");
    if (typeof block.result !== "string" || !/^0x[0-9a-f]+$/i.test(block.result)) {
      throw new Error("BLOCK_NUMBER_INVALID");
    }
    row.latestBlock = Number(BigInt(block.result));
    row.latencyMs = Math.max(row.latencyMs, block.latencyMs);
    row.status = "online";
  } catch (error) {
    row.status = "error";
    row.error = error instanceof Error ? error.message : String(error);
    failed = true;
  }
  rows.push(row);
}

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  readOnly: true,
  signing: false,
  broadcast: false,
  timeoutMs,
  providers: rows,
}, null, 2));

if (failed) process.exit(1);
console.log("RPC_MATRIX_OK networks=7 readOnly=true signing=false broadcast=false");
