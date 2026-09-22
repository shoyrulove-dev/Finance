import type { Metadata } from "next";
import { getDatabase } from "@/lib/mongodb";

export const metadata: Metadata = {
  title: "Crypto Prices and Market Data",
  description: "Latest cryptocurrency prices, market caps, trading volume and 24-hour changes."
};
export const dynamic = "force-dynamic";

function money(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2 }).format(value);
}

type Props = { searchParams: Promise<{ view?: string }> };
export default async function CryptoPage({ searchParams }: Props) {
  const db = await getDatabase();
  const view = (await searchParams).view || "market-cap";
  const assets = await db.collection("assets").find({ active: true, type: "crypto" }).toArray();
  const assetMap = new Map(assets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
  const sort: Record<string, 1 | -1> = view === "gainers" ? { change24h: -1 } : view === "losers" ? { change24h: 1 } : { marketCap: -1 };
  const prices = await db.collection("latest_prices").find({ assetId: { $in: [...assetMap.keys()] } }).sort(sort).limit(100).toArray();

  return <main className="container">
    <a className="back" href="/">← Bliss Finance</a>
    <p className="eyebrow">Crypto market</p>
    <h1>Crypto prices</h1>
    <p className="intro">Live market snapshots from our data providers, presented in USD.</p>
    <div className="filter-tabs"><a className={view === "market-cap" ? "active" : ""} href="/crypto">Market cap</a><a className={view === "gainers" ? "active" : ""} href="/crypto?view=gainers">Top gainers</a><a className={view === "losers" ? "active" : ""} href="/crypto?view=losers">Top losers</a></div>
    <div className="table-wrap">
      <table><thead><tr><th>Asset</th><th>Price</th><th>24h</th><th>Market cap</th><th>Source</th></tr></thead>
        <tbody>{prices.map((price) => { const asset = assetMap.get(price.assetId); const change = price.change24h as number | null; return <tr key={price._id.toString()}>
          <td><a className="asset-link" href={`/crypto/${asset?.slug || ""}`}><strong>{asset?.name || "Unknown"}</strong><small>{asset?.symbol || ""}</small></a></td>
          <td>{money(price.price)}</td>
          <td className={change != null && change >= 0 ? "positive" : "negative"}>{change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</td>
          <td>{money(price.marketCap)}</td><td className="muted">{price.provider}</td>
        </tr>; })}</tbody>
      </table>
    </div>
    <p className="updated">Data is aggregated from third-party providers and may be delayed. This is not investment advice.</p>
  </main>;
}
