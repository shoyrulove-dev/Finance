import type { MetadataRoute } from "next";
import { getDatabase } from "@/lib/mongodb";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/crypto`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/stocks`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
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
    const assets = await (await getDatabase()).collection("assets").find({ type: "crypto", active: true }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
    const dynamicPages = assets.flatMap((asset) => [
      { url: `${baseUrl}/crypto/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "hourly" as const, priority: 0.7 },
      { url: `${baseUrl}/convert/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "hourly" as const, priority: 0.5 }
    ]);
    const stocks = await (await getDatabase()).collection("assets").find({ type: "stock", active: true }, { projection: { symbol: 1, updatedAt: 1 } }).toArray();
    const stockPages = stocks.map((stock) => ({ url: `${baseUrl}/stocks/${String(stock.symbol).toLowerCase()}`, lastModified: stock.updatedAt || new Date(), changeFrequency: "daily" as const, priority: 0.6 }));
    return staticPages.concat(dynamicPages, stockPages);
  } catch { return staticPages; }
}
