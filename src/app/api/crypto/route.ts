import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDatabase();
    const prices = await db.collection("latest_prices").find({}).sort({ marketCap: -1, updatedAt: -1 }).limit(100).toArray();
    const assets = await db.collection("assets").find({ active: true }).toArray();
    const assetMap = new Map(assets.map((asset) => [`${asset.provider}:${asset.providerId}`, asset]));
    const data = prices.map((price) => {
      const asset = assetMap.get(price.assetId);
      return {
        id: price.assetId,
        slug: asset?.slug || price.assetId,
        symbol: asset?.symbol || "",
        name: asset?.name || asset?.symbol || "Unknown asset",
        price: price.price,
        change24h: price.change24h,
        marketCap: price.marketCap,
        volume24h: price.volume24h,
        currency: price.currency || "USD",
        provider: price.provider,
        updatedAt: price.updatedAt
      };
    });
    return NextResponse.json({ data, count: data.length, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Market data is temporarily unavailable" }, { status: 503 });
  }
}
