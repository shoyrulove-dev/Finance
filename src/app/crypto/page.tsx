import type { Metadata } from "next";
import Link from "next/link";
import { getDatabase } from "@/lib/mongodb";

export const metadata: Metadata = { title: "Crypto Prices", description: "Compare cryptocurrency prices, 24-hour changes, market caps and trading volume." };
export const revalidate = 300;
type Props = { searchParams: Promise<{ view?: string }> };
function money(value: unknown) { const n = Number(value); return value == null || !Number.isFinite(n) ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 6 : 2, notation: n >= 1_000_000 ? "compact" : "standard" }).format(n); }
function move(value: unknown) { const n = Number(value); return value == null || !Number.isFinite(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
export default async function CryptoPage({ searchParams }: Props) {
  const requested = (await searchParams).view;
  const view = requested === "gainers" || requested === "losers" ? requested : "market-cap";
  const db = await getDatabase();
  const assets = await db.collection("assets").find({ active: true, type: "crypto", provider: { $ne: "polygon" } }, { projection: { provider: 1, providerId: 1, slug: 1, symbol: 1, name: 1 } }).toArray();
  const map = new Map(assets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const sort: Record<string, 1 | -1> = view === "gainers" ? { change24h: -1 } : view === "losers" ? { change24h: 1 } : { marketCap: -1 };
  const prices = await db.collection("latest_prices").find({ assetId: { $in: [...map.keys()] } }).sort(sort).limit(100).toArray();
  return <main className="data-page"><div className="data-page-heading"><div><p className="eyebrow">Markets / crypto</p><h1>Cryptocurrency prices</h1><p>Compare prices, daily moves and market size in one place.</p></div><Link className="data-page-action" href="/search">Find an asset ↗</Link></div><div className="data-controls"><nav className="filter-tabs" aria-label="Sort crypto market"><Link className={view === "market-cap" ? "active" : ""} href="/crypto">Market cap</Link><Link className={view === "gainers" ? "active" : ""} href="/crypto?view=gainers">Top gainers</Link><Link className={view === "losers" ? "active" : ""} href="/crypto?view=losers">Top losers</Link></nav><span>{prices.length} assets</span></div><section className="data-table-card"><div className="data-table-scroll"><table className="data-table"><thead><tr><th>#</th><th>Asset</th><th>Price</th><th>24h</th><th>Market cap</th><th>Volume (24h)</th></tr></thead><tbody>{prices.map((price, index) => { const asset = map.get(price.assetId); if (!asset) return null; const change = price.change24h == null ? null : Number(price.change24h); return <tr key={price.assetId}><td className="rank">{index + 1}</td><td><Link className="asset-cell" href={`/crypto/${asset.slug}`}><span className="asset-avatar">{String(asset.symbol).slice(0, 1)}</span><span><strong>{asset.name}</strong><small>{asset.symbol}</small></span></Link></td><td className="num">{money(price.price)}</td><td className={`num ${change == null ? "muted" : change >= 0 ? "positive" : "negative"}`}>{move(change)}</td><td className="num">{money(price.marketCap)}</td><td className="num">{money(price.volume24h)}</td></tr>; })}</tbody></table></div>{prices.length === 0 && <p className="board-empty">Prices will appear here when data is available.</p>}</section><p className="data-footnote">Prices can be delayed. <Link href="/data-sources">About the data</Link></p></main>;
}
