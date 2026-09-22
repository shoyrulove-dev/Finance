import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/mongodb";
import { PriceChart } from "@/components/price-chart";
import { AffiliateCta } from "@/components/affiliate-cta";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function getAsset(slug: string) {
  const db = await getDatabase();
  const asset = await db.collection("assets").findOne({ slug, type: "crypto", active: true });
  if (!asset) return null;
  const assetId = `${asset.provider}:${asset.providerId}`;
  const [price, history, related] = await Promise.all([
    db.collection("latest_prices").findOne({ assetId }),
    db.collection("price_history").find({ assetId }).sort({ timestamp: -1 }).limit(30).toArray(),
    db.collection("assets").find({ type: "crypto", active: true, slug: { $ne: slug }, provider: { $ne: "polygon" } }, { projection: { slug: 1, symbol: 1, name: 1 } }).sort({ updatedAt: -1 }).limit(6).toArray()
  ]);
  return { asset, price, history, related };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getAsset(slug);
  if (!result) return { title: "Crypto asset not found" };
  const { asset, price } = result;
  const currentPrice = price?.price ? `$${Number(price.price).toLocaleString("en-US", { maximumFractionDigits: 6 })}` : "current market data";
  return {
    title: `${asset.name} (${asset.symbol}) Price`,
    description: `${asset.name} (${asset.symbol}) price is ${currentPrice}. View market cap, 24-hour change and historical crypto market data.`,
    alternates: { canonical: `/crypto/${asset.slug}` }
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
  const { asset, price, history, related } = result;
  const change = price?.change24h as number | null;
  const schema = { "@context": "https://schema.org", "@type": "FinancialProduct", name: asset.name, tickerSymbol: asset.symbol, offers: price?.price ? { "@type": "Offer", price: price.price, priceCurrency: "USD", availability: "https://schema.org/InStock" } : undefined };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: `What is the current ${asset.symbol} price?`, acceptedAnswer: { "@type": "Answer", text: `${asset.name} is currently priced at ${money(price?.price)} based on the latest available provider update.` } }, { "@type": "Question", name: `Where does the ${asset.symbol} data come from?`, acceptedAnswer: { "@type": "Answer", text: "Bliss Finance records automated market-data provider updates. Values may be delayed and are not investment advice." } }] };

  return <main className="container">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
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
    <section className="asset-context"><h2>{asset.name} market overview</h2><p>{asset.name} ({asset.symbol}) is tracked by Bliss Finance using the latest available market-data update. Its current market capitalization is {money(price?.marketCap)} and reported 24-hour volume is {money(price?.volume24h)}.</p><p>The latest 24-hour price move is <span className={change != null && change >= 0 ? "positive" : "negative"}>{change == null ? "not available" : `${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}%`}</span>. Values are informational and can change rapidly.</p></section>
    <section className="related-assets"><h2>Explore other crypto assets</h2><div>{related.map((item) => <a key={item.slug} href={`/crypto/${item.slug}`}><strong>{item.symbol}</strong><span>{item.name}</span></a>)}</div></section>
    <AffiliateCta symbol={String(asset.symbol)} kind="crypto" />
    <section className="history-section"><h2>Price history</h2><PriceChart values={history.map((item) => Number(item.price)).reverse()} /><h2>Recent price snapshots</h2>
      {history.length === 0 ? <p className="muted">Historical data is being collected.</p> : <div className="table-wrap"><table><thead><tr><th>Time (UTC)</th><th>Price</th><th>24h change</th><th>Provider</th></tr></thead><tbody>{history.map((item) => <tr key={item._id.toString()}><td>{new Date(item.timestamp).toISOString().replace("T", " ").slice(0, 16)}</td><td>{money(item.price)}</td><td>{item.change24h == null ? "—" : `${Number(item.change24h).toFixed(2)}%`}</td><td className="muted">{item.provider}</td></tr>)}</tbody></table></div>}
    </section>
    <p className="updated">Source: {price?.provider || "market data provider"}. Data may be delayed and is not investment advice.</p>
  </main>;
}
