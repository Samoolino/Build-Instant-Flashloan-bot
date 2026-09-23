import { NextResponse } from 'next/server';

const providers = [
  ['Ethereum', 'ETH_RPC_URL', 1],
  ['BNB Chain', 'BSC_RPC_URL', 56],
  ['Base', 'BASE_RPC_URL', 8453],
  ['Arbitrum One', 'ARBITRUM_RPC_URL', 42161],
  ['Avalanche C-Chain', 'AVAX_RPC_URL', 43114],
  ['Cronos', 'CRONOS_RPC_URL', 25],
  ['Sonic', 'SONIC_RPC_URL', 146],
];

async function rpc(url, method, params = []) {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('HTTP_' + response.status);
    const payload = await response.json();
    if (payload.error) throw new Error('RPC_' + payload.error.code + ':' + (payload.error.message || 'error'));
    return { result: payload.result, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const results = await Promise.all(providers.map(async ([name, env, expectedChainId]) => {
    const url = process.env[env]?.trim();
    if (!url) return { name, env, expectedChainId, status: 'not_configured' };

    try {
      if (/\$\{|YOUR_|PASTE_YOUR_|replace_with_|\$ALCHEMY_API_KEY/i.test(url)) {
        return { name, env, expectedChainId, status: 'invalid_configuration', error: 'placeholder_or_unevaluated_url' };
      }

      const chain = await rpc(url, 'eth_chainId');
      const chainId = Number(BigInt(chain.result));
      if (chainId !== expectedChainId) {
        return { name, env, expectedChainId, chainId, latencyMs: chain.latencyMs, status: 'chain_mismatch' };
      }

      const block = await rpc(url, 'eth_blockNumber');
      const latestBlock = Number(BigInt(block.result));

      return {
        name,
        env,
        expectedChainId,
        chainId,
        latestBlock,
        latencyMs: Math.max(chain.latencyMs, block.latencyMs),
        status: 'online',
      };
    } catch (error) {
      return {
        name,
        env,
        expectedChainId,
        status: 'error',
        error: error instanceof Error ? error.message : 'RPC_ERROR',
      };
    }
  }));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    readOnly: true,
    signing: false,
    broadcast: false,
    providers: results,
  }, { headers: { 'cache-control': 'no-store' } });
}
