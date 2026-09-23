import Link from "next/link";
import type { Metadata } from "next";
import { PriceChart } from "@/components/price-chart";
import { getCryptoBundle } from "@/lib/tool-data";
import { numberQuery, standardDeviation } from "@/lib/market-tools";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crypto volatility calculator", description: "Calculate recent cryptocurrency volatility from stored daily price observations.", alternates: { canonical: "/tools/volatility" } };

export default async function VolatilityPage({ searchParams }: { searchParams: Promise<{ asset?: string; days?: string }> }) {
  const query = await searchParams; const slug = (query.asset || "bitcoin").trim().toLowerCase(); const days = numberQuery(query.days, 30, 7, 90); const bundle = await getCryptoBundle(slug, days + 1);
  const prices = (bundle?.history || []).map((item: any) => Number(item.price)).filter(Number.isFinite).reverse(); const returns = prices.slice(1).map((price, index) => (price / prices[index] - 1) * 100); const daily = standardDeviation(returns); const annual = daily * Math.sqrt(365);
  return <main className="data-page tool-page"><div className="data-page-heading"><div><p className="eyebrow">DECISION TOOL</p><h1>Crypto volatility</h1><p>Measure how widely an asset's daily returns have varied over the selected period.</p></div></div><form className="tool-form" method="get"><label htmlFor="asset">Asset<input id="asset" name="asset" defaultValue={slug} placeholder="bitcoin"/></label><label htmlFor="days">Period<input id="days" name="days" type="number" min="7" max="90" defaultValue={days}/></label><button type="submit">Calculate</button></form>{bundle ? <><div className="tool-metrics"><div><span>Asset</span><strong><Link href={`/crypto/${bundle.asset.slug}`}>{bundle.asset.name}</Link></strong></div><div><span>Price observations</span><strong>{prices.length}</strong></div><div><span>Daily volatility</span><strong>{returns.length > 1 ? `${daily.toFixed(2)}%` : "Waiting for data"}</strong></div><div><span>Annualized estimate</span><strong>{returns.length > 1 ? `${annual.toFixed(2)}%` : "—"}</strong></div></div><section className="asset-panel tool-chart"><h2>{days}-day price range</h2><PriceChart values={prices}/></section><p className="data-footnote">Uses sample standard deviation of available daily returns. Historical volatility does not predict future performance.</p></> : <div className="asset-panel"><p className="empty-state">Asset not found. Try bitcoin, ethereum or solana.</p></div>}</main>;
}
