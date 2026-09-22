import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const client = new MongoClient(uri);
const dbName = process.env.MONGODB_DB || "finance";
const indexes = {
  assets: [
    [{ provider: 1, providerId: 1 }, { unique: true }],
    [{ slug: 1 }, { unique: true }],
    [{ symbol: 1 }, {}],
    [{ type: 1, active: 1 }, {}]
  ],
  latest_prices: [[{ assetId: 1 }, { unique: true }], [{ updatedAt: -1 }, {}]],
  price_history: [[{ assetId: 1, timestamp: -1 }, {}], [{ provider: 1, timestamp: -1 }, {}]],
  sync_runs: [[{ provider: 1, startedAt: -1 }, {}], [{ status: 1, startedAt: -1 }, {}]],
  providers: [[{ name: 1 }, { unique: true }]]
};

try {
  await client.connect();
  const db = client.db(dbName);
  for (const [name, collectionIndexes] of Object.entries(indexes)) {
    const collection = db.collection(name);
    for (const [key, options] of collectionIndexes) await collection.createIndex(key, options);
  }
  console.log(`MongoDB schema initialized: ${dbName}`);
} finally {
  await client.close();
}
