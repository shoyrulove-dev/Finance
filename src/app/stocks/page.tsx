import type { Metadata } from "next";
import Link from "next/link";
import { getDatabase } from "@/lib/mongodb";

export const metadata: Metadata = { title: "US Stock Prices", description: "Explore latest end-of-day prices and daily moves for popular US stocks." };
export const revalidate = 900;
export default async function StocksPage() {
  const db = await getDatabase();
  const [prices, assets] = await Promise.all([
    db.collection("latest_prices").find({ provider: "polygon" }).sort({ change24h: -1 }).limit(100).toArray(),
    db.collection("assets").find({ type: "stock", active: true }, { projection: { provider: 1, providerId: 1, symbol: 1, name: 1, profile: 1 } }).toArray(),
  ]);
  const map = new Map(assets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  return <main className="data-page"><div className="data-page-heading"><div><p className="eyebrow">Markets / US equities</p><h1>US stock prices</h1><p>Explore latest closes and daily moves. Prices reflect the end of the trading day.</p></div><Link className="data-page-action" href="/search">Find a company ↗</Link></div><div className="data-controls"><strong>Market watch</strong><span>{assets.length} companies · End-of-day data</span></div><section className="data-table-card"><div className="data-table-scroll"><table className="data-table"><thead><tr><th>Company</th><th>Symbol</th><th>Last close</th><th>Daily move</th><th>Volume</th></tr></thead><tbody>{prices.map((price) => { const asset = map.get(price.assetId); if (!asset) return null; const change = price.change24h == null ? null : Number(price.change24h); return <tr key={price.assetId}><td><Link className="asset-cell" href={`/stocks/${String(asset.symbol).toLowerCase()}`}><span className="asset-avatar stock-avatar">{String(asset.symbol).slice(0, 1)}</span><span><strong>{asset.name}</strong><small>{asset.profile?.industry || "US equity"}</small></span></Link></td><td className="ticker-cell">{asset.symbol}</td><td className="num">{price.price == null ? "—" : `$${Number(price.price).toFixed(2)}`}</td><td className={`num ${change == null ? "muted" : change >= 0 ? "positive" : "negative"}`}>{change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</td><td className="num">{price.volume24h == null ? "—" : Number(price.volume24h).toLocaleString("en-US")}</td></tr>; })}</tbody></table></div>{prices.length === 0 && <p className="board-empty">Stock prices will appear here when data is available.</p>}</section><p className="data-footnote">US stocks are shown at the latest available close. <Link href="/data-sources">About the data</Link></p></main>;
}
