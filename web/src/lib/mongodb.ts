import "@/lib/load-env";

import { MongoClient } from "mongodb";

type GlobalMongo = typeof globalThis & {
  __wattsup_mongo?: Promise<MongoClient>;
};

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to the repo-root .env (next to pyproject.toml) or web/.env.local, then restart `npm run dev`."
    );
  }

  const g = globalThis as GlobalMongo;

  if (!g.__wattsup_mongo) {
    const client = new MongoClient(uri);
    g.__wattsup_mongo = client.connect();
  }

  const client = await g.__wattsup_mongo;
  const dbName = process.env.MONGODB_DB || "wattsup";
  return client.db(dbName);
}
