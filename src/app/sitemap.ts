import type { MetadataRoute } from "next";
import { getDatabase } from "@/lib/mongodb";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/crypto`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/data-sources`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/disclaimer`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 }
  ];
  try {
    const assets = await (await getDatabase()).collection("assets").find({ active: true }, { projection: { slug: 1, updatedAt: 1 } }).toArray();
    const dynamicPages = assets.flatMap((asset) => [
      { url: `${baseUrl}/crypto/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "hourly" as const, priority: 0.7 },
      { url: `${baseUrl}/convert/${asset.slug}`, lastModified: asset.updatedAt || new Date(), changeFrequency: "hourly" as const, priority: 0.5 }
    ]);
    return staticPages.concat(dynamicPages);
  } catch { return staticPages; }
}
