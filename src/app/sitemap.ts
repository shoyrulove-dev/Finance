import type { MetadataRoute } from "next";
import { getDatabase } from "@/lib/mongodb";

const contentUpdatedAt = new Date("2026-09-24T00:00:00.000Z");
const policyUpdatedAt = new Date("2026-09-22T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";
  const page = (path: string, lastModified = contentUpdatedAt) => ({ url: `${baseUrl}${path}`, lastModified });
  const staticPages: MetadataRoute.Sitemap = [
    page(""), page("/crypto"), page("/stocks"), page("/tools"),
    page("/tools/compare"), page("/tools/volatility"), page("/tools/stablecoins"),
    page("/tools/stablecoins/usdt-vs-usdc"), page("/tools/stablecoins/usdc-vs-dai"),
    ...["usdt", "usdc", "dai", "usde", "pyusd"].map((symbol) => page(`/tools/stablecoins/${symbol}`)),
    page("/tools/drawdown"), page("/tools/dividends"), page("/market-brief"),
    page("/markets/rwa"), page("/markets/prediction-markets"),
    page("/about", policyUpdatedAt), page("/contact", policyUpdatedAt),
    page("/editorial-policy", policyUpdatedAt), page("/data-sources", policyUpdatedAt),
    page("/disclaimer", policyUpdatedAt), page("/privacy", policyUpdatedAt), page("/terms", policyUpdatedAt),
  ];

  try {
    const db = await getDatabase();
    const [assets, stocks, briefs, latestPrice, latestRwa, latestPrediction, latestBrief] = await Promise.all([
      db.collection("assets").find({ type: "crypto", active: true, provider: "coingecko" }, { projection: { slug: 1, updatedAt: 1 } }).toArray(),
      db.collection("assets").find({ type: "stock", active: true }, { projection: { symbol: 1, updatedAt: 1 } }).toArray(),
      db.collection("market_briefs").find({}, { projection: { date: 1, updatedAt: 1 } }).sort({ date: -1 }).limit(90).toArray(),
      db.collection("latest_prices").findOne({}, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } }),
      db.collection("category_markets").findOne({ active: true }, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } }),
      db.collection("prediction_markets").findOne({ active: true }, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } }),
      db.collection("market_briefs").findOne({}, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } }),
    ]);
    const freshness = new Map<string, Date>([
      [baseUrl, latestPrice?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/crypto`, latestPrice?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/stocks`, latestPrice?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/tools/stablecoins`, latestPrice?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/tools/stablecoins/usdt-vs-usdc`, latestPrice?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/tools/stablecoins/usdc-vs-dai`, latestPrice?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/market-brief`, latestBrief?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/markets/rwa`, latestRwa?.updatedAt || contentUpdatedAt],
      [`${baseUrl}/markets/prediction-markets`, latestPrediction?.updatedAt || contentUpdatedAt],
    ]);
    for (const symbol of ["usdt", "usdc", "dai", "usde", "pyusd"]) freshness.set(`${baseUrl}/tools/stablecoins/${symbol}`, latestPrice?.updatedAt || contentUpdatedAt);

    const primaryPages = staticPages.map((item) => freshness.has(item.url) ? { ...item, lastModified: freshness.get(item.url) } : item);
    const dynamicPages = assets.flatMap((asset) => [
      page(`/crypto/${asset.slug}`, asset.updatedAt || contentUpdatedAt),
      page(`/convert/${asset.slug}`, asset.updatedAt || contentUpdatedAt),
    ]);
    const stockPages = stocks.map((stock) => page(`/stocks/${String(stock.symbol).toLowerCase()}`, stock.updatedAt || contentUpdatedAt));
    const toolPages = assets.slice(0, 20).flatMap((asset) => [
      page(`/tools/volatility/${asset.slug}`, asset.updatedAt || contentUpdatedAt),
      page(`/tools/drawdown/${asset.slug}`, asset.updatedAt || contentUpdatedAt),
    ]);
    const comparisonPages = ["bitcoin-vs-ethereum", "bitcoin-vs-solana", "ethereum-vs-solana", "bitcoin-vs-xrp"].map((pair) => page(`/tools/compare/${pair}`, latestPrice?.updatedAt || contentUpdatedAt));
    const briefPages = briefs.map((brief) => page(`/market-brief/${brief.date}`, brief.updatedAt || contentUpdatedAt));
    return primaryPages.concat(dynamicPages, stockPages, toolPages, comparisonPages, briefPages);
  } catch {
    return staticPages;
  }
}
