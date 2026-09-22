import type { CreateIndexesOptions, Db, IndexDescription } from "mongodb";
import { getDatabase } from "./mongodb";

type AppIndex = IndexDescription & { options?: CreateIndexesOptions };
const indexes: Record<string, AppIndex[]> = {
  assets: [
    { key: { provider: 1, providerId: 1 }, options: { unique: true } },
    { key: { slug: 1 }, options: { unique: true } },
    { key: { symbol: 1 } },
    { key: { type: 1, active: 1 } }
  ],
  latest_prices: [
    { key: { assetId: 1 }, options: { unique: true } },
    { key: { updatedAt: -1 } }
  ],
  price_history: [
    { key: { assetId: 1, timestamp: -1 } },
    { key: { provider: 1, timestamp: -1 } }
  ],
  sync_runs: [
    { key: { provider: 1, startedAt: -1 } },
    { key: { status: 1, startedAt: -1 } }
  ],
  providers: [{ key: { name: 1 }, options: { unique: true } }]
};

export async function ensureDatabaseSchema(db?: Db) {
  const database = db || await getDatabase();
  for (const [collectionName, collectionIndexes] of Object.entries(indexes)) {
    const collection = database.collection(collectionName);
    for (const index of collectionIndexes) {
      await collection.createIndex(index.key, index.options);
    }
  }
  return { database: database.databaseName, collections: Object.keys(indexes) };
}
