import type { MetadataRoute } from "next";
import { getDatabase } from "@/lib/mongodb";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/crypto`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/stocks`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/tools`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/tools/compare`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/tools/volatility`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/tools/stablecoins`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.6 },
    { url: `${baseUrl}/tools/stablecoins/usdt-vs-usdc`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.6 },
    { url: `${baseUrl}/tools/stablecoins/usdc-vs-dai`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.6 },
    ...["usdt", "usdc", "dai", "fdusd", "usde", "pyusd"].map((symbol) => ({ url: `${baseUrl}/tools/stablecoins/${symbol}`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.6 })),
    { url: `${baseUrl}/tools/drawdown`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/tools/dividends`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/market-brief`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/markets/rwa`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/markets/prediction-markets`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/status`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.3 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/editorial-policy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/data-sources`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/disclaimer`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 }
  ];
  try {
    const db = await getDatabase();
    const assets = await db.collection("assets").find({ type: "crypto", active: true, provider: "coingecko" }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
    const dynamicPages = assets.flatMap((asset) => [
      { url: `${baseUrl}/crypto/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "hourly" as const, priority: 0.7 },
      { url: `${baseUrl}/convert/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "hourly" as const, priority: 0.5 }
    ]);
    const stocks = await (await getDatabase()).collection("assets").find({ type: "stock", active: true }, { projection: { symbol: 1, updatedAt: 1 } }).toArray();
    const stockPages = stocks.map((stock) => ({ url: `${baseUrl}/stocks/${String(stock.symbol).toLowerCase()}`, lastModified: stock.updatedAt || new Date(), changeFrequency: "daily" as const, priority: 0.6 }));
    const toolPages = assets.slice(0, 20).flatMap((asset) => [
      { url: `${baseUrl}/tools/volatility/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "daily" as const, priority: 0.55 },
      { url: `${baseUrl}/tools/drawdown/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "daily" as const, priority: 0.55 },
    ]);
    const comparisonPages = ["bitcoin-vs-ethereum", "bitcoin-vs-solana", "ethereum-vs-solana", "bitcoin-vs-xrp"].map((pair) => ({ url: `${baseUrl}/tools/compare/${pair}`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.6 }));
    const briefs = await db.collection("market_briefs").find({}, { projection: { date: 1, updatedAt: 1 } }).sort({ date: -1 }).limit(90).toArray();
    const briefPages = briefs.map((brief) => ({ url: `${baseUrl}/market-brief/${brief.date}`, lastModified: brief.updatedAt || new Date(), changeFrequency: "never" as const, priority: 0.5 }));
    return staticPages.concat(dynamicPages, stockPages, toolPages, comparisonPages, briefPages);
  } catch { return staticPages; }
}
