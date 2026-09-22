import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "Bliss Finance - Global Market Data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() { return new ImageResponse(<div style={{ background: "#07111f", color: "#eaf1fb", width: "100%", height: "100%", padding: "74px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 20, color: "#66e3b4", fontSize: 34, fontWeight: 700 }}><span style={{ fontSize: 72 }}>B</span> Bliss Finance</div><div style={{ display: "flex", flexDirection: "column", gap: 20 }}><span style={{ color: "#66e3b4", fontSize: 25, letterSpacing: 5 }}>GLOBAL MARKET DATA</span><span style={{ fontSize: 82, fontWeight: 700 }}>Markets, clearly.</span><span style={{ color: "#9aabc1", fontSize: 31 }}>Crypto and US stock market data.</span></div></div>, { ...size }); }
