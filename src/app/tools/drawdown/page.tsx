import Link from "next/link";
import type { Metadata } from "next";
import { PriceChart } from "@/components/price-chart";
import { getCryptoBundle } from "@/lib/tool-data";
import { formatPrice, numberQuery } from "@/lib/market-tools";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crypto drawdown calculator", description: "Calculate how far a cryptocurrency trades below its highest stored price observation.", alternates: { canonical: "/tools/drawdown" } };

export default async function DrawdownPage({ searchParams }: { searchParams: Promise<{ asset?: string; days?: string }> }) {
  const query = await searchParams; const slug = (query.asset || "bitcoin").trim().toLowerCase(); const days = numberQuery(query.days, 90, 7, 365); const bundle = await getCryptoBundle(slug, days); const prices = (bundle?.history || []).map((item: any) => Number(item.price)).filter(Number.isFinite).reverse(); const peak = prices.length ? Math.max(...prices) : 0; const current = Number(bundle?.price?.price); const drawdown = peak > 0 && Number.isFinite(current) ? ((current - peak) / peak) * 100 : null;
  return <main className="data-page tool-page"><div className="data-page-heading"><div><p className="eyebrow">DECISION TOOL</p><h1>Drawdown from peak</h1><p>See how far the latest price is below the highest observation in the selected period.</p></div></div><form className="tool-form" method="get"><label htmlFor="asset">Asset<input id="asset" name="asset" defaultValue={slug}/></label><label htmlFor="days">Period<input id="days" name="days" type="number" min="7" max="365" defaultValue={days}/></label><button type="submit">Calculate</button></form>{bundle && drawdown != null ? <><div className="tool-metrics"><div><span>Asset</span><strong><Link href={`/crypto/${bundle.asset.slug}`}>{bundle.asset.name}</Link></strong></div><div><span>Latest price</span><strong>{formatPrice(current)}</strong></div><div><span>Observed peak</span><strong>{formatPrice(peak)}</strong></div><div><span>Drawdown</span><strong className={drawdown < 0 ? "negative" : "positive"}>{drawdown.toFixed(2)}%</strong></div></div><section className="asset-panel tool-chart"><h2>Price history used</h2><PriceChart values={prices}/></section><p className="data-footnote">Calculated from {prices.length} stored observations, not an exchange-reported all-time high.</p></> : <div className="asset-panel"><p className="empty-state">Asset or sufficient price history was not found.</p></div>}</main>;
}
