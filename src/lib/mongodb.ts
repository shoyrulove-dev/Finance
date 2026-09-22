import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient };
export function getMongoClient() {
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");
  const client = globalForMongo.mongoClient ?? new MongoClient(uri);
  if (process.env.NODE_ENV !== "production") globalForMongo.mongoClient = client;
  return client;
}

export async function getDatabase() {
  const client = getMongoClient();
  await client.connect();
  return client.db(process.env.MONGODB_DB || "finance");
}
