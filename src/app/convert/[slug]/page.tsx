import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/mongodb";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ amount?: string }> };

async function load(slug: string) {
  const db = await getDatabase();
  const asset = await db.collection("assets").findOne({ slug, type: "crypto", active: true });
  if (!asset) return null;
  const price = await db.collection("latest_prices").findOne({ assetId: `${asset.provider}:${asset.providerId}` });
  return { asset, price };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await load(slug);
  if (!result) return { title: "Converter not found" };
  return { title: `${result.asset.symbol} to USD Converter`, description: `Convert ${result.asset.name} (${result.asset.symbol}) to USD using the latest market price.`, alternates: { canonical: `/convert/${result.asset.slug}` } };
}

export default async function ConverterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const result = await load(slug);
  if (!result || !result.price?.price) notFound();
  const rate = Number(result.price.price);
  const amount = Math.max(0, Number(query.amount || 1) || 1);
  const points = [1, 5, 10, 50, 100, 1000];
  return <main className="container">
    <a className="back" href={`/crypto/${slug}`}>← {result.asset.name} market data</a>
    <p className="eyebrow">Currency converter</p>
    <h1>{result.asset.symbol} to USD</h1>
    <p className="intro">Convert {result.asset.name} to United States dollars using the latest available market price.</p>
    <form className="converter-form" action={`/convert/${slug}`} method="get"><label htmlFor="amount">Amount of {result.asset.symbol}</label><div><input id="amount" name="amount" type="number" min="0" step="any" defaultValue={amount} /><button type="submit">Convert</button></div></form>
    <div className="conversion-result"><span>{amount.toLocaleString("en-US")} {result.asset.symbol}</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount * rate)}</strong><small>Rate: 1 {result.asset.symbol} = {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 8 }).format(rate)}</small></div>
    <h2>Common {result.asset.symbol} to USD conversions</h2><div className="table-wrap"><table><thead><tr><th>{result.asset.symbol}</th><th>USD</th></tr></thead><tbody>{points.map((point) => <tr key={point}><td>{point.toLocaleString("en-US")} {result.asset.symbol}</td><td>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(point * rate)}</td></tr>)}</tbody></table></div>
    <p className="updated">Rates are indicative market data and may be delayed. Not investment advice.</p>
  </main>;
}
