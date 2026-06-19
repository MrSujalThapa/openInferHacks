import type { Collection, Document } from "mongodb";
import { getDb } from "./mongo.js";

export type GenieRepositories = {
  groups: Collection<Document>;
  customizations: Collection<Document>;
  agentRuns: Collection<Document>;
  styleMemory: Collection<Document>;
};

export function getRepositories(): GenieRepositories {
  const db = getDb();

  return {
    groups: db.collection("groups"),
    customizations: db.collection("customizations"),
    agentRuns: db.collection("agent_runs"),
    styleMemory: db.collection("style_memory"),
  };
}

export async function ensureIndexes(): Promise<void> {
  const repositories = getRepositories();

  await Promise.all([
    repositories.groups.createIndex({ userId: 1, domain: 1, path: 1 }),
    repositories.groups.createIndex({ groupId: 1 }, { unique: true }),
    repositories.customizations.createIndex({ userId: 1, domain: 1, pathPattern: 1, enabled: 1 }),
    repositories.customizations.createIndex({ customizationId: 1 }, { unique: true }),
    repositories.agentRuns.createIndex({ userId: 1, createdAt: -1 }),
    repositories.agentRuns.createIndex({ traceId: 1 }, { unique: true }),
    repositories.styleMemory.createIndex({ userId: 1, updatedAt: -1 }),
  ]);
}

