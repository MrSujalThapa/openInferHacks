import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/genie_mvp";
const dbName = process.env.MONGODB_DB ?? "genie_mvp";

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
console.log("URI:", uri);
console.log("DB name:", db.databaseName);
console.log("customizations:", await db.collection("customizations").countDocuments());
console.log("agent_runs:", await db.collection("agent_runs").countDocuments());
console.log("style_memory:", await db.collection("style_memory").countDocuments());
const latest = await db.collection("agent_runs").findOne({}, { sort: { createdAt: -1 } });
console.log("latest agent_run traceId:", latest?.traceId ?? null);
await client.close();
