import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/mongodb";
import { PriceChart } from "@/components/price-chart";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ symbol: string }> };

async function load(symbol: string) {
  const db = await getDatabase();
  const asset = await db.collection("assets").findOne({ provider: "polygon", symbol: symbol.toUpperCase(), active: true });
  if (!asset) return null;
  const assetId = `polygon:${asset.providerId}`;
  const [price, history] = await Promise.all([db.collection("latest_prices").findOne({ assetId }), db.collection("price_history").find({ assetId }).sort({ timestamp: -1 }).limit(35).toArray()]);
  return { asset, price, history };
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
  const { asset, price, history } = result;
  const schema = { "@context": "https://schema.org", "@type": "Corporation", name: asset.name, tickerSymbol: asset.symbol, url: `https://finance.blissbiovn.com/stocks/${String(asset.symbol).toLowerCase()}` };
  const change = price?.change24h as number | null;
  return <main className="container"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><a className="back" href="/stocks">← US stock market</a><p className="eyebrow">US equity · EOD</p><h1>{asset.name}</h1><p className="intro">{asset.symbol} end-of-day price and market data.</p><section className="metric-grid"><div className="metric"><span>Last close</span><strong>{price?.price == null ? "—" : `$${Number(price.price).toFixed(2)}`}</strong></div><div className="metric"><span>Daily change</span><strong className={change != null && change >= 0 ? "positive" : "negative"}>{change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</strong></div><div className="metric"><span>Volume</span><strong>{price?.volume24h == null ? "—" : Number(price.volume24h).toLocaleString("en-US")}</strong></div><div className="metric"><span>Source</span><strong>Massive</strong></div></section><section className="history-section"><h2>30-day price history</h2><PriceChart values={history.map((item) => Number(item.price)).reverse()} /><p className="muted">End-of-day historical bars are adjusted according to the provider response and may be delayed.</p></section><p className="updated">This is general market information, not investment advice.</p></main>;
}
