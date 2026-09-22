import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/mongodb";
import { PriceChart } from "@/components/price-chart";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getAsset(slug: string) {
  const db = await getDatabase();
  const asset = await db.collection("assets").findOne({ slug, active: true });
  if (!asset) return null;
  const assetId = `${asset.provider}:${asset.providerId}`;
  const [price, history] = await Promise.all([
    db.collection("latest_prices").findOne({ assetId }),
    db.collection("price_history").find({ assetId }).sort({ timestamp: -1 }).limit(30).toArray()
  ]);
  return { asset, price, history };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getAsset(slug);
  if (!result) return { title: "Crypto asset not found" };
  const { asset, price } = result;
  const currentPrice = price?.price ? `$${Number(price.price).toLocaleString("en-US", { maximumFractionDigits: 6 })}` : "current market data";
  return {
    title: `${asset.name} (${asset.symbol}) Price`,
    description: `${asset.name} (${asset.symbol}) price is ${currentPrice}. View market cap, 24-hour change and historical crypto market data.`
  };
}

function money(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 8 : 2 }).format(value);
}

export default async function CryptoDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getAsset(slug);
  if (!result) notFound();
  const { asset, price, history } = result;
  const change = price?.change24h as number | null;
  const schema = { "@context": "https://schema.org", "@type": "FinancialProduct", name: asset.name, tickerSymbol: asset.symbol, offers: price?.price ? { "@type": "Offer", price: price.price, priceCurrency: "USD", availability: "https://schema.org/InStock" } : undefined };

  return <main className="container">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <a className="back" href="/crypto">← All crypto markets</a>
    <p className="eyebrow">Crypto asset</p>
    <h1>{asset.name}</h1>
    <p className="intro">{asset.symbol} price, market data and recent history.</p>
    <section className="metric-grid">
      <div className="metric"><span>Current price</span><strong>{money(price?.price)}</strong></div>
      <div className="metric"><span>24h change</span><strong className={change != null && change >= 0 ? "positive" : "negative"}>{change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</strong></div>
      <div className="metric"><span>Market cap</span><strong>{money(price?.marketCap)}</strong></div>
      <div className="metric"><span>24h volume</span><strong>{money(price?.volume24h)}</strong></div>
    </section>
    <section className="history-section"><h2>Price history</h2><PriceChart values={history.map((item) => Number(item.price)).reverse()} /><h2>Recent price snapshots</h2>
      {history.length === 0 ? <p className="muted">Historical data is being collected.</p> : <div className="table-wrap"><table><thead><tr><th>Time (UTC)</th><th>Price</th><th>24h change</th><th>Provider</th></tr></thead><tbody>{history.map((item) => <tr key={item._id.toString()}><td>{new Date(item.timestamp).toISOString().replace("T", " ").slice(0, 16)}</td><td>{money(item.price)}</td><td>{item.change24h == null ? "—" : `${Number(item.change24h).toFixed(2)}%`}</td><td className="muted">{item.provider}</td></tr>)}</tbody></table></div>}
    </section>
    <p className="updated">Source: {price?.provider || "market data provider"}. Data may be delayed and is not investment advice.</p>
  </main>;
}
