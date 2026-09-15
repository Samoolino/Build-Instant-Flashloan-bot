export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#08090c', color: '#f5f7fa', padding: 48, fontFamily: 'system-ui' }}>
      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ opacity: 0.65, letterSpacing: 2 }}>FLASHLOAN EXECUTION TERMINAL</p>
        <h1 style={{ fontSize: 48, marginBottom: 8 }}>Institutional Arbitrage</h1>
        <p style={{ opacity: 0.75 }}>Execution authorization is locked.</p>
        <div style={{ marginTop: 40, padding: 24, border: '1px solid #252a33', borderRadius: 16 }}>
          <strong>Safety boundary</strong>
          <p>Live signing: disabled · Broadcast: disabled · Authorization: 0</p>
          <p>Minimum net profit floor: $2 USD · Target: $100 USD</p>
        </div>
      </section>
    </main>
  );
}
