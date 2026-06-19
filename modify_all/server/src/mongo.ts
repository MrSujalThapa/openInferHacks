import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[mongo] MONGODB_URI not set — running without persistence");
    return null;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    await ensureIndexes(db);
    console.log("[mongo] connected");
    return db;
  } catch (err) {
    console.warn("[mongo] connection failed:", err);
    return null;
  }
}

export function getDb(): Db | null {
  return db;
}

export function isMongoConnected(): boolean {
  return db !== null;
}

async function ensureIndexes(database: Db): Promise<void> {
  await database.collection("groups").createIndex({ userId: 1, domain: 1, path: 1 });
  await database.collection("groups").createIndex({ groupId: 1 }, { unique: true });
  await database.collection("customizations").createIndex({ userId: 1, domain: 1, pathPattern: 1, enabled: 1 });
  await database.collection("customizations").createIndex({ customizationId: 1 }, { unique: true });
  await database.collection("agent_runs").createIndex({ userId: 1, createdAt: -1 });
  await database.collection("agent_runs").createIndex({ traceId: 1 }, { unique: true });
  await database.collection("style_memory").createIndex({ userId: 1, updatedAt: -1 });
}

export async function seedStyleMemory(): Promise<void> {
  if (!db) return;
  const existing = await db.collection("style_memory").findOne({ userId: "demo-user", source: "demo_seed" });
  if (existing) return;
  await db.collection("style_memory").insertOne({
    userId: "demo-user",
    content: "User prefers compact dark-mode sections, softer contrast, and fewer distracting sidebar modules.",
    source: "demo_seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
