import Link from "next/link";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDatabase();
  const [cryptoCount, stockCount, latest] = await Promise.all([
    db.collection("assets").countDocuments({ type: "crypto", active: true, provider: { $ne: "polygon" } }),
    db.collection("assets").countDocuments({ type: "stock", active: true }),
    db.collection("latest_prices").find({}).sort({ updatedAt: -1 }).limit(1).toArray()
  ]);
  const latestTime = latest[0]?.updatedAt ? new Date(latest[0].updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Waiting for first data sync";
  return (
    <main className="container">
      <p className="eyebrow">Global market data</p>
      <h1>Understand the market clearly.</h1>
      <p className="intro">Explore transparent crypto and US stock market data, updated by automated provider syncs.</p>
      <div className="metric-grid"><Link className="metric asset-link" href="/crypto"><span>Crypto markets</span><strong>{cryptoCount}</strong><small>assets tracked</small></Link><Link className="metric asset-link" href="/stocks"><span>US stocks</span><strong>{stockCount}</strong><small>EOD companies</small></Link><Link className="metric asset-link" href="/search"><span>Market search</span><strong>Search</strong><small>crypto and stocks</small></Link><div className="metric"><span>Last sync</span><strong>UTC</strong><small>{latestTime}</small></div></div>
      <div className="card"><strong>Data transparency</strong><span>Prices are sourced from external market-data providers, may be delayed, and are not investment advice.</span></div>
    </main>
  );
}
