import { MongoClient, type Db } from "mongodb";

export type MongoStatus = "not_configured" | "connected" | "disconnected" | "error";

let client: MongoClient | undefined;
let db: Db | undefined;
let status: MongoStatus = "not_configured";
let lastError: string | undefined;

export async function connectMongo(uri: string | undefined, dbName: string): Promise<void> {
  if (!uri) {
    status = "not_configured";
    return;
  }

  if (db && status === "connected") {
    return;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    status = "connected";
    lastError = undefined;
  } catch (error) {
    status = "error";
    lastError = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

export function getDb(): Db {
  if (!db || status !== "connected") {
    throw new Error("MongoDB is not connected");
  }

  return db;
}

export async function pingMongo(): Promise<MongoStatus> {
  if (!db || status !== "connected") {
    return status;
  }

  try {
    await db.command({ ping: 1 });
    status = "connected";
    lastError = undefined;
    return status;
  } catch (error) {
    status = "error";
    lastError = error instanceof Error ? error.message : String(error);
    return status;
  }
}

export function getMongoDiagnostics(): { status: MongoStatus; error?: string } {
  return {
    status,
    error: lastError,
  };
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
  }

  client = undefined;
  db = undefined;
  status = "disconnected";
}

