import LinkBase from "next/link";
const Link = LinkBase as any;
import type { Metadata } from "next";
import { getDatabase } from "@/lib/mongodb";
import { JsonLd } from "@/components/json-ld";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Daily market brief | Bliss Finance", description: "A concise daily snapshot of crypto and US stock market moves." };
function pct(value: unknown) { const n = Number(value); return Number.isFinite(n) ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : "—"; }
export default async function MarketBriefPage() {
  const db = await getDatabase();
  const [assets, prices] = await Promise.all([db.collection("assets").find({ active: true }, { projection: { slug: 1, symbol: 1, name: 1, type: 1 } }).toArray(), db.collection("latest_prices").find({}).sort({ updatedAt: -1 }).toArray()]);
  const map = new Map(assets.map((a: any) => [`${a.provider}:${a.providerId}`, a]));
  const crypto = prices.filter((p: any) => map.get(p.assetId)?.type === "crypto").sort((a: any, b: any) => Number(b.change24h || 0) - Number(a.change24h || 0));
  const stocks = prices.filter((p: any) => map.get(p.assetId)?.type === "stock").sort((a: any, b: any) => Number(b.change24h || 0) - Number(a.change24h || 0));
  const updated = prices[0]?.updatedAt ? new Date(prices[0].updatedAt).toISOString() : new Date().toISOString();
  return <main className="data-page"><JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: "Daily market brief", dateModified: updated, author: { "@type": "Organization", name: "Bliss Finance" } }} /><div className="data-page-heading"><div><p className="eyebrow">MARKET BRIEF</p><h1>Today in markets.</h1><p>A concise snapshot of the biggest moves in the latest available data.</p></div><Link className="data-page-action" href="/tools">Open decision tools</Link></div><div className="brief-grid"><section className="asset-panel"><h2>Crypto leaders</h2>{crypto.slice(0, 5).map((p: any) => { const a: any = map.get(p.assetId); return a && <Link className="brief-row" href={`/crypto/${a.slug}`} key={p.assetId}><span><strong>{a.name}</strong><small>{a.symbol}</small></span><b className={Number(p.change24h) >= 0 ? "positive" : "negative"}>{pct(p.change24h)}</b></Link>; })}</section><section className="asset-panel"><h2>US stock leaders</h2>{stocks.slice(0, 5).map((p: any) => { const a: any = map.get(p.assetId); return a && <Link className="brief-row" href={`/stocks/${String(a.symbol).toLowerCase()}`} key={p.assetId}><span><strong>{a.name}</strong><small>{a.symbol}</small></span><b className={Number(p.change24h) >= 0 ? "positive" : "negative"}>{pct(p.change24h)}</b></Link>; })}</section></div><p className="panel-note">Updated {new Date(updated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC. Stock prices are end-of-day where applicable.</p></main>;
}
