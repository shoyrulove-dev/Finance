import LinkBase from "next/link";
const Link = LinkBase as any;
import type { Metadata } from "next";
import { getDatabase } from "@/lib/mongodb";
import { JsonLd } from "@/components/json-ld";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Daily market brief", description: "A concise daily snapshot of crypto and US stock market moves." };
function pct(value: unknown) { const number = Number(value); return Number.isFinite(number) ? `${number >= 0 ? "+" : ""}${number.toFixed(2)}%` : "—"; }

export default async function MarketBriefPage() {
  const db = await getDatabase();
  const [assets, prices, archives] = await Promise.all([
    db.collection("assets").find({ active: true }, { projection: { slug: 1, symbol: 1, name: 1, type: 1, provider: 1, providerId: 1 } }).toArray(),
    db.collection("latest_prices").find({}).sort({ updatedAt: -1 }).toArray(),
    db.collection("market_briefs").find({}, { projection: { date: 1 } }).sort({ date: -1 }).limit(14).toArray(),
  ]);
  const map = new Map(assets.map((asset: any) => [`${asset.provider}:${asset.providerId}`, asset]));
  const crypto = prices.filter((price: any) => map.get(price.assetId)?.type === "crypto").sort((a: any, b: any) => Number(b.change24h || 0) - Number(a.change24h || 0));
  const stocks = prices.filter((price: any) => map.get(price.assetId)?.type === "stock").sort((a: any, b: any) => Number(b.change24h || 0) - Number(a.change24h || 0));
  const updated = prices[0]?.updatedAt ? new Date(prices[0].updatedAt).toISOString() : new Date().toISOString();
  return <main className="data-page tool-page"><JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: "Daily market brief", dateModified: updated, author: { "@type": "Organization", name: "Bliss Finance" } }} /><div className="data-page-heading"><div><p className="eyebrow">MARKET BRIEF</p><h1>Today in markets</h1><p>A concise snapshot of the biggest moves in the latest available data.</p></div><Link className="data-page-action" href={"/tools" as any}>Open decision tools</Link></div><div className="brief-grid"><section className="asset-panel"><h2>Crypto leaders</h2>{crypto.slice(0, 5).map((price: any) => { const asset: any = map.get(price.assetId); return asset && <Link className="brief-row" href={`/crypto/${asset.slug}`} key={price.assetId}><span><strong>{asset.name}</strong><small>{asset.symbol}</small></span><b className={Number(price.change24h) >= 0 ? "positive" : "negative"}>{pct(price.change24h)}</b></Link>; })}</section><section className="asset-panel"><h2>US stock leaders</h2>{stocks.slice(0, 5).map((price: any) => { const asset: any = map.get(price.assetId); return asset && <Link className="brief-row" href={`/stocks/${String(asset.symbol).toLowerCase()}`} key={price.assetId}><span><strong>{asset.name}</strong><small>{asset.symbol}</small></span><b className={Number(price.change24h) >= 0 ? "positive" : "negative"}>{pct(price.change24h)}</b></Link>; })}</section></div>{archives.length > 0 && <section className="brief-archive"><h2>Previous market briefs</h2><div>{archives.map((brief: any) => <Link href={`/market-brief/${brief.date}`} key={brief.date}>{brief.date}</Link>)}</div></section>}<p className="panel-note">Updated {new Date(updated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC. Stock prices are end-of-day where applicable.</p></main>;
}
