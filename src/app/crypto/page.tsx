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

export default async function CryptoPage() {
  const db = await getDatabase();
  const [prices, assets] = await Promise.all([
    db.collection("latest_prices").find({}).sort({ marketCap: -1, updatedAt: -1 }).limit(100).toArray(),
    db.collection("assets").find({ active: true }).toArray()
  ]);
  const assetMap = new Map(assets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));

  return <main className="container">
    <a className="back" href="/">← Bliss Finance</a>
    <p className="eyebrow">Crypto market</p>
    <h1>Crypto prices</h1>
    <p className="intro">Live market snapshots from our data providers, presented in USD.</p>
    <div className="table-wrap">
      <table><thead><tr><th>Asset</th><th>Price</th><th>24h</th><th>Market cap</th><th>Source</th></tr></thead>
        <tbody>{prices.map((price) => { const asset = assetMap.get(price.assetId); const change = price.change24h as number | null; return <tr key={price._id.toString()}>
          <td><strong>{asset?.name || "Unknown"}</strong><small>{asset?.symbol || ""}</small></td>
          <td>{money(price.price)}</td>
          <td className={change != null && change >= 0 ? "positive" : "negative"}>{change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</td>
          <td>{money(price.marketCap)}</td><td className="muted">{price.provider}</td>
        </tr>; })}</tbody>
      </table>
    </div>
    <p className="updated">Data is aggregated from third-party providers and may be delayed. This is not investment advice.</p>
  </main>;
}
