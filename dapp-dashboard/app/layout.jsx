export const metadata = {
  title: 'Flashloan Execution Terminal',
  description: 'Institutional arbitrage execution dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#08090c' }}>{children}</body>
    </html>
  );
}
