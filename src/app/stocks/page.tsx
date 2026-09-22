import type { Metadata } from "next";
import { getDatabase } from "@/lib/mongodb";

export const metadata: Metadata = { title: "US Stock Prices and Market Data", description: "End-of-day prices and market data for popular US stocks." };
export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const db = await getDatabase();
  const [prices, assets] = await Promise.all([db.collection("latest_prices").find({ provider: "polygon" }).sort({ updatedAt: -1 }).limit(100).toArray(), db.collection("assets").find({ type: "stock", active: true }).toArray()]);
  const map = new Map(assets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  return <main className="container"><a className="back" href="/">← Bliss Finance</a><p className="eyebrow">US equities</p><h1>Stock prices</h1><p className="intro">End-of-day market data for popular US companies.</p><div className="table-wrap"><table><thead><tr><th>Company</th><th>Symbol</th><th>Last price</th><th>Volume</th><th>Source</th></tr></thead><tbody>{prices.map((price) => { const asset = map.get(price.assetId); return <tr key={price._id.toString()}><td><strong>{asset?.name || "Unknown"}</strong></td><td>{asset?.symbol || ""}</td><td>{price.price == null ? "—" : `$${Number(price.price).toFixed(2)}`}</td><td>{price.volume24h == null ? "—" : Number(price.volume24h).toLocaleString("en-US")}</td><td className="muted">Massive EOD</td></tr>; })}</tbody></table>{prices.length === 0 && <p className="updated">Stock data will appear after a Massive API key is configured.</p>}</div><p className="updated">Stock data is end-of-day and may be delayed. This is not investment advice.</p></main>;
}
