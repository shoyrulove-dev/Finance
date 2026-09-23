import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { getDatabase } from "@/lib/mongodb";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Crypto Market Tools, RWA & Prediction Markets",
  description: "Track crypto and US stocks, explore RWA and prediction markets, monitor stablecoin pegs, and use practical risk tools.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Crypto Market Tools, RWA & Prediction Markets | Bliss Finance",
    description: "Live market dashboards and practical tools for crypto, stocks, stablecoins, RWA and prediction markets.",
    url: "/",
    type: "website",
  },
};

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
function probability(market: any) {
  const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
  const yes = outcomes.findIndex((item: unknown) => String(item).toLowerCase() === "yes");
  const value = Number(market?.prices?.[yes >= 0 ? yes : 0]);
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

export default async function HomePage() {
  const db = await getDatabase();
  const [cryptoAssets, stockAssets, latest, rwa, tokenized, predictions] = await Promise.all([
    db.collection("assets").find({ type: "crypto", active: true, provider: { $ne: "polygon" } }, { projection: { provider: 1, providerId: 1, slug: 1, symbol: 1, name: 1 } }).toArray(),
    db.collection("assets").find({ type: "stock", active: true }, { projection: { provider: 1, providerId: 1, symbol: 1, name: 1 } }).toArray(),
    db.collection("latest_prices").find({}).sort({ updatedAt: -1 }).limit(1).toArray(),
    db.collection("category_markets").find({ category: "rwa", active: true }).sort({ marketCap: -1 }).limit(50).toArray(),
    db.collection("category_markets").find({ category: "tokenized-stock", active: true }).sort({ marketCap: -1 }).limit(5).toArray(),
    db.collection("prediction_markets").find({ active: true }).sort({ volume24h: -1 }).limit(3).toArray(),
  ]);
  const cryptoIds = cryptoAssets.map((asset) => `${asset.provider}:${asset.providerId}`);
  const stockIds = stockAssets.map((asset) => `${asset.provider}:${asset.providerId}`);
  const stableIds = cryptoAssets.filter((asset) => ["tether", "usd-coin", "dai"].includes(String(asset.slug))).map((asset) => `${asset.provider}:${asset.providerId}`);
  const [cryptoPrices, stockPrices, stablePrices] = await Promise.all([
    db.collection("latest_prices").find({ assetId: { $in: cryptoIds } }).sort({ marketCap: -1 }).limit(12).toArray(),
    db.collection("latest_prices").find({ assetId: { $in: stockIds } }).sort({ change24h: -1 }).limit(8).toArray(),
    db.collection("latest_prices").find({ assetId: { $in: stableIds } }).toArray(),
  ]);
  const cryptoMap = new Map(cryptoAssets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const stockMap = new Map(stockAssets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const leading = cryptoPrices.slice(0, 4);
  const topPrediction = predictions[0];
  const pegRisk = stablePrices.sort((a, b) => Math.abs(Number(b.price) - 1) - Math.abs(Number(a.price) - 1))[0];
  const pegAsset = pegRisk ? cryptoMap.get(pegRisk.assetId) : null;
  const rwaTrackedCap = rwa.reduce((sum, row) => sum + (Number(row.marketCap) || 0), 0);
  const lastUpdated = latest[0]?.updatedAt ? new Date(latest[0].updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Data pending";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";

  return <main className="market-home">
    <JsonLd data={{
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "Bliss Finance", url: siteUrl, description: "Market dashboards and decision tools for crypto, stocks, stablecoins, RWA and prediction markets.", potentialAction: { "@type": "SearchAction", target: `${siteUrl}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
        { "@type": "ItemList", name: "Featured market intelligence", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Prediction market dashboard", url: `${siteUrl}/markets/prediction-markets` },
          { "@type": "ListItem", position: 2, name: "RWA and tokenized stock tracker", url: `${siteUrl}/markets/rwa` },
          { "@type": "ListItem", position: 3, name: "Stablecoin peg tracker", url: `${siteUrl}/tools/stablecoins` },
        ] },
      ],
    }} />
    <section className="market-intro">
      <div><p className="eyebrow">Market intelligence &amp; decision tools</p><h1>See what matters in markets.</h1><p>Track markets, explore emerging themes, and measure risk with practical tools.</p><div className="hero-actions"><Link href={"/markets/prediction-markets" as any}>Explore prediction markets</Link><Link href={"/tools" as any}>Open decision tools</Link></div></div>
      <form className="market-search" action="/search"><label htmlFor="market-query">Find an asset</label><div><input id="market-query" name="q" placeholder="Search Bitcoin, BTC, Apple..." aria-label="Search crypto and stocks" /><button type="submit">Search</button></div></form>
    </section>
    <div className="market-meta"><span className="market-dot" aria-hidden="true" />Latest data: {lastUpdated} UTC <Link href="/data-sources">How market data is sourced →</Link></div>

    <section className="featured-intelligence" aria-labelledby="featured-heading">
      <div className="featured-heading"><div><p className="eyebrow">Featured intelligence</p><h2 id="featured-heading">Beyond the price ticker</h2></div><p>Focused views for fast-moving market themes.</p></div>
      <div className="insight-grid">
        <Link className="insight-card insight-primary" href={"/markets/prediction-markets" as any}>
          <span className="insight-label">Prediction markets · most active</span><strong>{probability(topPrediction)}</strong><h3>{topPrediction?.question || "Market-implied probabilities"}</h3><p>{topPrediction ? `${money(topPrediction.volume24h)} traded in the last 24 hours.` : "Track active questions ranked by recent volume."}</p><b>View prediction market dashboard →</b>
        </Link>
        <Link className="insight-card" href={"/markets/rwa" as any}>
          <span className="insight-label">RWA &amp; tokenized assets</span><strong>{money(rwaTrackedCap)}</strong><h3>Tracked RWA market cap</h3><p>{rwa[0] ? `${rwa[0].name} currently leads this tracked category.` : "Explore assets connected to off-chain value."}</p><b>Explore RWA and tokenized stocks →</b>
        </Link>
        <Link className="insight-card" href={pegAsset ? `/tools/stablecoins/${String(pegAsset.symbol).toLowerCase()}` as any : "/tools/stablecoins" as any}>
          <span className="insight-label">Stablecoin peg monitor</span><strong>{pegRisk ? money(pegRisk.price) : "Live"}</strong><h3>{pegAsset ? `${pegAsset.symbol} peg check` : "Dollar peg tracker"}</h3><p>Review peg distance, liquidity and stored price history for major stablecoins.</p><b>Check stablecoin peg risk →</b>
        </Link>
      </div>
      <nav className="decision-links" aria-label="Popular market decision tools"><span>Popular tools</span><Link href={"/tools/compare" as any}>Compare crypto assets</Link><Link href={"/tools/volatility/bitcoin" as any}>Bitcoin volatility today</Link><Link href={"/tools/drawdown/bitcoin" as any}>Bitcoin drawdown</Link><Link href={"/tools/dividends" as any}>Dividend income calculator</Link></nav>
    </section>

    <div className="market-section-heading"><div><p className="eyebrow">Popular assets</p><h2>Crypto prices at a glance</h2></div><Link className="section-text-link" href="/crypto">View all cryptocurrency prices →</Link></div>
    <section className="quote-strip" aria-label="Popular cryptocurrency prices">{leading.map((price) => { const asset = cryptoMap.get(price.assetId); return asset && <Link href={`/crypto/${asset.slug}`} key={price.assetId} className="quote-card"><span className="quote-symbol">{asset.symbol}</span><strong>{money(price.price)}</strong><span className={changeClass(price.change24h)}>{change(price.change24h)} <small>24h</small></span></Link>; })}</section>

    <div className="market-section-heading"><div><p className="eyebrow">Explore markets</p><h2>Market overview</h2></div><div className="market-pills"><Link href="/crypto">All crypto <span>{cryptoAssets.length}</span></Link><Link href="/stocks">US stocks <span>{stockAssets.length}</span></Link><Link href={"/markets/rwa" as any}>RWA <span>{rwa.length}</span></Link><Link href={"/markets/rwa?view=tokenized-stocks" as any}>Tokenized stocks <span>{tokenized.length}</span></Link></div></div>
    <div className="market-dashboard-grid">
      <section className="market-board"><div className="board-heading"><div><h3>Cryptocurrency prices</h3><p>Leading assets by market cap</p></div><Link href="/crypto">View all crypto →</Link></div><div className="market-table-wrap"><table className="market-table"><thead><tr><th>#</th><th>Asset</th><th>Price</th><th>24h</th><th>Market cap</th></tr></thead><tbody>{cryptoPrices.map((price, index) => { const asset = cryptoMap.get(price.assetId); return asset && <tr key={price.assetId}><td className="rank">{index + 1}</td><td><Link className="asset-cell" href={`/crypto/${asset.slug}`}><span className="asset-avatar">{String(asset.symbol).slice(0, 1)}</span><span><strong>{asset.name}</strong><small>{asset.symbol}</small></span></Link></td><td className="number-cell">{money(price.price)}</td><td className={`number-cell ${changeClass(price.change24h)}`}>{change(price.change24h)}</td><td className="number-cell">{money(price.marketCap)}</td></tr>; })}</tbody></table></div>{cryptoPrices.length === 0 && <p className="board-empty">Market prices will appear here shortly.</p>}</section>
      <div className="market-side"><section className="market-board"><div className="board-heading"><div><h3>US stocks</h3><p>Latest end-of-day prices</p></div><Link href="/stocks">View all US stock prices →</Link></div><div className="stock-list">{stockPrices.map((price) => { const asset = stockMap.get(price.assetId); return asset && <Link href={`/stocks/${String(asset.symbol).toLowerCase()}`} key={price.assetId} className="stock-item"><span className="stock-symbol">{asset.symbol}</span><span className="stock-name">{asset.name}</span><strong>{money(price.price)}</strong><span className={changeClass(price.change24h)}>{change(price.change24h)}</span></Link>; })}</div>{stockPrices.length === 0 && <p className="board-empty">Stock prices will appear here shortly.</p>}</section><section className="market-note"><span className="market-note-icon">↗</span><div><h3>Turn data into a decision</h3><p>Compare assets, calculate volatility and drawdown, or estimate dividend income.</p><Link href={"/tools" as any}>Explore all market decision tools →</Link></div></section></div>
    </div>
    <p className="market-disclaimer">Prices may be delayed. US stock prices are end-of-day. Prediction-market probabilities are market prices, not Bliss Finance forecasts. This information is for reference, not investment advice.</p>
  </main>;
}
