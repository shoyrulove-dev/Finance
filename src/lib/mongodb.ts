import { MongoClient } from "mongodb";
import { mongoRequestScope } from "./mongo-request-scope.mjs";

type MongoGlobal = { mongoClientPromise?: Promise<MongoClient> };
const globalForMongo = globalThis as unknown as MongoGlobal;

export function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");
  const createClient = () => new MongoClient(uri, { maxPoolSize: 2, minPoolSize: 0, maxIdleTimeMS: 10_000, serverSelectionTimeoutMS: 5_000, connectTimeoutMS: 5_000 });
  const scope = mongoRequestScope.getStore();
  if (scope) {
    if (!scope.ready) {
      scope.client = createClient();
      scope.ready = scope.client.connect();
    }
    return scope.ready;
  }
  if (!globalForMongo.mongoClientPromise) {
    const client = createClient();
    globalForMongo.mongoClientPromise = client.connect().catch(async error => {
      globalForMongo.mongoClientPromise = undefined;
      await client.close().catch(() => {});
      throw error;
    });
  }
  return globalForMongo.mongoClientPromise;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB || "finance");
}
