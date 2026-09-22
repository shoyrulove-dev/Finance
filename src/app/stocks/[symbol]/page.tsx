import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ symbol: string }> };

async function load(symbol: string) {
  const db = await getDatabase();
  const asset = await db.collection("assets").findOne({ provider: "polygon", symbol: symbol.toUpperCase(), active: true });
  if (!asset) return null;
  const price = await db.collection("latest_prices").findOne({ assetId: `polygon:${asset.providerId}` });
  return { asset, price };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const result = await load(symbol);
  if (!result) return { title: "Stock not found" };
  return { title: `${result.asset.symbol} Stock Price`, description: `${result.asset.name} (${result.asset.symbol}) latest end-of-day stock price, volume and market data.` };
}

export default async function StockDetailPage({ params }: Props) {
  const { symbol } = await params;
  const result = await load(symbol);
  if (!result) notFound();
  const { asset, price } = result;
  return <main className="container"><a className="back" href="/stocks">← US stock market</a><p className="eyebrow">US equity · EOD</p><h1>{asset.name}</h1><p className="intro">{asset.symbol} end-of-day price and market data.</p><section className="metric-grid"><div className="metric"><span>Last close</span><strong>{price?.price == null ? "—" : `$${Number(price.price).toFixed(2)}`}</strong></div><div className="metric"><span>Volume</span><strong>{price?.volume24h == null ? "—" : Number(price.volume24h).toLocaleString("en-US")}</strong></div><div className="metric"><span>Market</span><strong>US stocks</strong></div><div className="metric"><span>Source</span><strong>Massive</strong></div></section><section className="history-section"><h2>About this data</h2><p className="muted">This page uses the previous trading day bar from Massive. Prices are adjusted according to the provider response and may be delayed.</p></section><p className="updated">This is general market information, not investment advice.</p></main>;
}
