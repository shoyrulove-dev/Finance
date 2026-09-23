import { getDatabase } from "@/lib/mongodb";

export function marketAssetId(asset: { provider?: string; providerId?: string }) {
  return `${asset.provider}:${asset.providerId}`;
}

export async function getCryptoBundle(slug: string, historyLimit = 91) {
  const db = await getDatabase();
  const asset: any = await db.collection("assets").findOne({ slug: slug.toLowerCase(), type: "crypto", active: true });
  if (!asset) return null;
  const assetId = marketAssetId(asset);
  const [price, history] = await Promise.all([
    db.collection("latest_prices").findOne({ assetId }),
    db.collection("price_history").find({ assetId }).sort({ timestamp: -1 }).limit(historyLimit).toArray(),
  ]);
  return { asset, price, history, assetId };
}

export async function getCryptoRows(slugs: string[]) {
  const db = await getDatabase();
  const assets = await db.collection("assets").find({ slug: { $in: slugs }, type: "crypto", active: true }).toArray();
  const priceIds = assets.map((asset: any) => marketAssetId(asset));
  const prices = await db.collection("latest_prices").find({ assetId: { $in: priceIds } }).toArray();
  const priceMap = new Map(prices.map((price: any) => [price.assetId, price]));
  const assetMap = new Map(assets.map((asset: any) => [asset.slug, asset]));
  return slugs.map((slug) => { const asset: any = assetMap.get(slug); return asset ? { asset, price: priceMap.get(marketAssetId(asset)) } : null; }).filter(Boolean) as Array<{ asset: any; price: any }>;
}
