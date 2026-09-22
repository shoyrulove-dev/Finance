import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
type MongoGlobal = { mongoClient?: MongoClient; mongoClientPromise?: Promise<MongoClient> };
const globalForMongo = globalThis as unknown as MongoGlobal;

export function getMongoClient() {
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(uri, { maxPoolSize: 2, minPoolSize: 0, maxIdleTimeMS: 10_000, serverSelectionTimeoutMS: 5_000, connectTimeoutMS: 5_000 });
    globalForMongo.mongoClient = client;
    globalForMongo.mongoClientPromise = client.connect();
  }
  return globalForMongo.mongoClientPromise;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB || "finance");
}
