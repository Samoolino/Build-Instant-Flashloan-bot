'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setError('');
      const response = await fetch('/api/providers', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP_' + response.status);
      setData(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Provider request failed');
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#08090c', color: '#f5f7fa', padding: 48, fontFamily: 'system-ui' }}>
      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ opacity: 0.65, letterSpacing: 2 }}>FLASHLOAN PROVIDER DASHBOARD</p>
        <h1>RPC Provider Health</h1>
        <p>Read-only provider connectivity. Signing and broadcast remain disabled.</p>

        <div style={{ marginTop: 32, padding: 20, border: '1px solid #252a33', borderRadius: 16 }}>
          {error && <p>Dashboard API error: {error}</p>}
          {!data && !error && <p>Checking providers...</p>}

          {data?.providers.map((provider) => (
            <div key={provider.env} style={{ padding: '14px 0', borderBottom: '1px solid #1b1f26' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <strong>{provider.name}</strong>
                <span>{provider.status}</span>
              </div>
              <div style={{ opacity: 0.7, marginTop: 5, fontSize: 13 }}>
                expected chain {provider.expectedChainId}
                {provider.chainId ? ' · actual chain ' + provider.chainId : ''}
                {provider.latestBlock ? ' · block ' + provider.latestBlock : ''}
                {provider.latencyMs ? ' · ' + provider.latencyMs + ' ms' : ''}
              </div>
              {provider.error && <div style={{ marginTop: 5, fontSize: 13 }}>error: {provider.error}</div>}
            </div>
          ))}
        </div>

        {data && <p style={{ opacity: 0.6 }}>Last checked: {data.timestamp}</p>}
      </section>
    </main>
  );
}
