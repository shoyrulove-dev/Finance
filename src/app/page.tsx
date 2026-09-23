import Link from "next/link";
import { getDatabase } from "@/lib/mongodb";

export const revalidate = 300;

function money(value: unknown) {
  const number = Number(value);
  if (value == null || !Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: number < 1 ? 6 : 2, notation: number >= 1_000_000 ? "compact" : "standard" }).format(number);
}
function change(value: unknown) {
  const number = Number(value);
  return value == null || !Number.isFinite(number) ? "—" : `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}
function changeClass(value: unknown) { return value == null ? "muted" : Number(value) >= 0 ? "positive" : "negative"; }

export default async function HomePage() {
  const db = await getDatabase();
  const [cryptoAssets, stockAssets, latest] = await Promise.all([
    db.collection("assets").find({ type: "crypto", active: true, provider: { $ne: "polygon" } }, { projection: { provider: 1, providerId: 1, slug: 1, symbol: 1, name: 1 } }).toArray(),
    db.collection("assets").find({ type: "stock", active: true }, { projection: { provider: 1, providerId: 1, symbol: 1, name: 1 } }).toArray(),
    db.collection("latest_prices").find({}).sort({ updatedAt: -1 }).limit(1).toArray(),
  ]);
  const cryptoIds = cryptoAssets.map((asset) => `${asset.provider}:${asset.providerId}`);
  const stockIds = stockAssets.map((asset) => `${asset.provider}:${asset.providerId}`);
  const [cryptoPrices, stockPrices] = await Promise.all([
    db.collection("latest_prices").find({ assetId: { $in: cryptoIds } }).sort({ marketCap: -1 }).limit(12).toArray(),
    db.collection("latest_prices").find({ assetId: { $in: stockIds } }).sort({ change24h: -1 }).limit(8).toArray(),
  ]);
  const cryptoMap = new Map(cryptoAssets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const stockMap = new Map(stockAssets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const leading = cryptoPrices.slice(0, 4);
  const lastUpdated = latest[0]?.updatedAt ? new Date(latest[0].updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Data pending";

  return <main className="market-home">
    <section className="market-intro">
      <div><p className="eyebrow">Your market overview</p><h1>Crypto &amp; stocks, in focus.</h1><p>Explore prices, daily moves, and the assets behind them.</p></div>
      <form className="market-search" action="/search"><label htmlFor="market-query">Find an asset</label><div><input id="market-query" name="q" placeholder="Search Bitcoin, BTC, Apple..." aria-label="Search crypto and stocks" /><button type="submit">Search</button></div></form>
    </section>
    <div className="market-meta"><span className="market-dot" aria-hidden="true" />Latest data: {lastUpdated} UTC <Link href="/data-sources">About our data ↗</Link></div>
    <section className="quote-strip" aria-label="Popular cryptocurrency prices">{leading.map((price) => { const asset = cryptoMap.get(price.assetId); return asset && <Link href={`/crypto/${asset.slug}`} key={price.assetId} className="quote-card"><span className="quote-symbol">{asset.symbol}</span><strong>{money(price.price)}</strong><span className={changeClass(price.change24h)}>{change(price.change24h)} <small>24h</small></span></Link>; })}</section>
    <div className="market-section-heading"><div><p className="eyebrow">Explore markets</p><h2>Market overview</h2></div><div className="market-pills"><Link href="/crypto">All crypto <span>{cryptoAssets.length}</span></Link><Link href="/stocks">US stocks <span>{stockAssets.length}</span></Link></div></div>
    <div className="market-dashboard-grid">
      <section className="market-board"><div className="board-heading"><div><h3>Cryptocurrency prices</h3><p>Leading assets by market cap</p></div><Link href="/crypto">View all crypto →</Link></div><div className="market-table-wrap"><table className="market-table"><thead><tr><th>#</th><th>Asset</th><th>Price</th><th>24h</th><th>Market cap</th></tr></thead><tbody>{cryptoPrices.map((price, index) => { const asset = cryptoMap.get(price.assetId); return asset && <tr key={price.assetId}><td className="rank">{index + 1}</td><td><Link className="asset-cell" href={`/crypto/${asset.slug}`}><span className="asset-avatar">{String(asset.symbol).slice(0, 1)}</span><span><strong>{asset.name}</strong><small>{asset.symbol}</small></span></Link></td><td className="number-cell">{money(price.price)}</td><td className={`number-cell ${changeClass(price.change24h)}`}>{change(price.change24h)}</td><td className="number-cell">{money(price.marketCap)}</td></tr>; })}</tbody></table></div>{cryptoPrices.length === 0 && <p className="board-empty">Market prices will appear here shortly.</p>}</section>
      <div className="market-side"><section className="market-board"><div className="board-heading"><div><h3>US stocks</h3><p>Latest end-of-day prices</p></div><Link href="/stocks">View all →</Link></div><div className="stock-list">{stockPrices.map((price) => { const asset = stockMap.get(price.assetId); return asset && <Link href={`/stocks/${String(asset.symbol).toLowerCase()}`} key={price.assetId} className="stock-item"><span className="stock-symbol">{asset.symbol}</span><span className="stock-name">{asset.name}</span><strong>{money(price.price)}</strong><span className={changeClass(price.change24h)}>{change(price.change24h)}</span></Link>; })}</div>{stockPrices.length === 0 && <p className="board-empty">Stock prices will appear here shortly.</p>}</section><section className="market-note"><span className="market-note-icon">↗</span><div><h3>Look beyond the price</h3><p>Open any asset for historical prices, market context, and source information.</p><Link href="/search">Explore assets →</Link></div></section></div>
    </div>
    <p className="market-disclaimer">Prices may be delayed. US stock prices are end-of-day. This information is for reference, not investment advice.</p>
  </main>;
}
