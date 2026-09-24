import type { Metadata } from "next"; import "./globals.css";
export const metadata: Metadata={title:"Flash Arb7 — Hermes Control",description:"Agentic flash-loan operations control surface"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
