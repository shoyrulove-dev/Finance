import Link from "next/link";
import { getDatabase } from "@/lib/mongodb";
import { NativeAd } from "@/components/native-ad";

export const revalidate = 300;

function money(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2, notation: value > 999_999 ? "compact" : "standard" }).format(value);
}
function percent(value: number | null | undefined) { return value == null ? "-" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`; }

export default async function HomePage() {
  const db = await getDatabase();
  const [cryptoAssets, stockAssets, latest] = await Promise.all([
    db.collection("assets").find({ type: "crypto", active: true, provider: { $ne: "polygon" } }).toArray(),
    db.collection("assets").find({ provider: "polygon", active: true }).toArray(),
    db.collection("latest_prices").find({}).sort({ updatedAt: -1 }).limit(1).toArray(),
  ]);
  const cryptoIds = cryptoAssets.map((asset) => `${asset.provider}:${asset.providerId}`);
  const stockIds = stockAssets.map((asset) => `${asset.provider}:${asset.providerId}`);
  const [cryptoPrices, stockPrices] = await Promise.all([
    db.collection("latest_prices").find({ assetId: { $in: cryptoIds } }).sort({ marketCap: -1 }).limit(8).toArray(),
    db.collection("latest_prices").find({ assetId: { $in: stockIds } }).sort({ change24h: -1 }).limit(6).toArray(),
  ]);
  const cryptoMap = new Map(cryptoAssets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const stockMap = new Map(stockAssets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const movers = [...cryptoPrices].filter((item) => item.change24h != null).sort((a, b) => Number(b.change24h) - Number(a.change24h));
  const latestTime = latest[0]?.updatedAt ? new Date(latest[0].updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Waiting for first data sync";
  return <main className="dashboard">
    <section className="market-hero">
      <div className="hero-copy"><p className="eyebrow">Live market dashboard</p><h1>Markets, clearly.</h1><p>Crypto and US-stock prices, refreshed by automated provider syncs.</p><div className="headline-tickers" aria-label="Leading crypto prices">{cryptoPrices.slice(0, 3).map((price) => { const asset = cryptoMap.get(price.assetId); const change = Number(price.change24h); return <Link href={`/crypto/${asset?.slug}`} key={price.assetId}><span>{asset?.symbol}</span><b>{money(Number(price.price))}</b><small className={change >= 0 ? "positive" : "negative"}>{percent(change)}</small></Link>; })}</div></div>
      <form className="dashboard-search" action="/search"><input name="q" placeholder="Search BTC, Apple, SOL..." aria-label="Search markets" /><button>Search</button></form>
    </section>
    <section className="overview-grid" aria-label="Market overview">
      <Link href="/crypto"><span>Crypto assets</span><strong>{cryptoAssets.length}</strong><small>Tracked by market cap</small></Link><Link href="/stocks"><span>US stock coverage</span><strong>{stockAssets.length}</strong><small>End-of-day snapshots</small></Link><Link href="/crypto?view=gainers"><span>Top crypto mover</span><strong className="positive">{movers[0] ? percent(Number(movers[0].change24h)) : "-"}</strong><small>{movers[0] ? cryptoMap.get(movers[0].assetId)?.name : "No data"}</small></Link><Link href="/status"><span>Data freshness</span><strong>UTC</strong><small>{latestTime}</small></Link>
    </section>
    <NativeAd />
    <section className="dashboard-grid">
      <div className="dashboard-panel wide"><div className="panel-heading"><div><p className="eyebrow">Crypto</p><h2>Top crypto assets</h2></div><Link href="/crypto">View all -&gt;</Link></div><div className="market-list">{cryptoPrices.map((price, index) => { const asset = cryptoMap.get(price.assetId); const change = Number(price.change24h); return <Link href={`/crypto/${asset?.slug}`} key={price.assetId} className="market-row"><span className="rank">{index + 1}</span><span className="asset-name"><strong>{asset?.name || "Unknown"}</strong><small>{asset?.symbol}</small></span><span>{money(Number(price.price))}</span><span className={change >= 0 ? "positive" : "negative"}>{percent(change)}</span></Link>; })}</div></div>
      <div className="dashboard-panel movers"><div className="panel-heading"><div><p className="eyebrow">Momentum</p><h2>Top movers</h2></div><Link href="/crypto?view=gainers">All movers -&gt;</Link></div>{movers.slice(0, 5).map((price) => { const asset = cryptoMap.get(price.assetId); return <Link href={`/crypto/${asset?.slug}`} key={price.assetId} className="mover-row"><span><strong>{asset?.symbol}</strong><small>{asset?.name}</small></span><b className="positive">{percent(Number(price.change24h))}</b></Link>; })}</div>
      <div className="dashboard-panel stocks"><div className="panel-heading"><div><p className="eyebrow">Equities</p><h2>Top US stock movers</h2></div><Link href="/stocks">View all -&gt;</Link></div><div className="market-list">{stockPrices.map((price) => { const asset = stockMap.get(price.assetId); const change = price.change24h == null ? null : Number(price.change24h); return <Link href={`/stocks/${String(asset?.symbol).toLowerCase()}`} key={price.assetId} className="market-row stock-row"><span className="asset-name"><strong>{asset?.name || "Unknown"}</strong><small>{asset?.symbol}</small></span><span>{money(Number(price.price))}</span><span className={change != null && change >= 0 ? "positive" : "negative"}>{percent(change)}</span></Link>; })}</div></div>
      <aside className="dashboard-panel trust"><p className="eyebrow">Built for clarity</p><h2>Market data, not market hype.</h2><p>Sources, timestamps and disclaimers are visible throughout Bliss Finance.</p><Link href="/data-sources">How data works -&gt;</Link><Link href="/disclaimer">Read disclaimer -&gt;</Link></aside>
    </section>
  </main>;
}
