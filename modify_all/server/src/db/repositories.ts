import type { Collection, Document } from "mongodb";
import type {
  AgentTraceStep,
  CustomizationId,
  EditableGroup,
  GroupId,
  PatchOperation,
  SiteCustomization,
  TargetSignature,
  UserId,
} from "../../../shared/contracts.js";
import { DEMO_USER_ID } from "../../../shared/contracts.js";
import { tryGetDb, getDb, requireDb } from "./mongo.js";

export type GenieRepositories = {
  groups: Collection<Document>;
  customizations: Collection<Document>;
  agentRuns: Collection<Document>;
  styleMemory: Collection<Document>;
};

const DEMO_STYLE_MEMORY =
  "User prefers compact dark-mode sections, softer contrast, and fewer distracting sidebar modules.";

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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

export async function seedStyleMemory(userId: UserId = DEMO_USER_ID): Promise<void> {
  const db = tryGetDb();
  if (!db) return;

  const existing = await db.collection("style_memory").findOne({ userId, source: "demo_seed" });
  if (existing) return;

  const now = new Date();
  await db.collection("style_memory").insertOne({
    userId,
    content: DEMO_STYLE_MEMORY,
    source: "demo_seed",
    createdAt: now,
    updatedAt: now,
  });
}

export async function getStyleMemory(userId: UserId = DEMO_USER_ID): Promise<string[]> {
  const db = tryGetDb();
  if (!db) return [DEMO_STYLE_MEMORY];

  const docs = await db
    .collection("style_memory")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();

  if (!docs.length) return [DEMO_STYLE_MEMORY];
  return docs.map((d) => d.content as string);
}

export async function addStyleMemory(content: string, userId: UserId = DEMO_USER_ID): Promise<void> {
  const db = tryGetDb();
  if (!db) return;

  const now = new Date();
  await db.collection("style_memory").insertOne({
    userId,
    content,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  });
}

export async function saveCustomization(input: {
  domain: string;
  pathPattern: string;
  groupId: GroupId;
  target: TargetSignature;
  operations: PatchOperation[];
  enabled: boolean;
}): Promise<CustomizationId> {
  const db = requireDb();
  const customizationId = id("custom");
  const now = new Date();

  const result = await db.collection("customizations").updateOne(
    {
      userId: DEMO_USER_ID,
      domain: input.domain,
      pathPattern: input.pathPattern,
      groupId: input.groupId,
    },
    {
      $set: {
        customizationId,
        userId: DEMO_USER_ID,
        domain: input.domain,
        pathPattern: input.pathPattern,
        groupId: input.groupId,
        target: input.target,
        operations: input.operations,
        enabled: input.enabled,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  console.log(
    `[mongo] saveCustomization groupId=${input.groupId} matched=${result.matchedCount} modified=${result.modifiedCount} upserted=${result.upsertedCount ?? 0}`,
  );

  return customizationId;
}

export async function getCustomizations(domain: string, path: string): Promise<SiteCustomization[]> {
  const db = tryGetDb();
  if (!db) return [];

  const docs = await db
    .collection("customizations")
    .find({ userId: DEMO_USER_ID, domain, pathPattern: path, enabled: true })
    .toArray();

  return docs.map((d) => ({
    customizationId: d.customizationId as string,
    userId: DEMO_USER_ID,
    domain: d.domain as string,
    pathPattern: d.pathPattern as string,
    groupId: d.groupId as string,
    target: d.target as TargetSignature,
    operations: d.operations as PatchOperation[],
    enabled: d.enabled as boolean,
    createdAt: (d.createdAt as Date).toISOString(),
    updatedAt: (d.updatedAt as Date).toISOString(),
  }));
}

export async function saveGroup(group: Omit<EditableGroup, "createdAt" | "updatedAt">): Promise<void> {
  const db = tryGetDb();
  if (!db) return;

  const now = new Date();
  await db.collection("groups").updateOne(
    { groupId: group.groupId },
    {
      $set: { ...group, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function saveAgentRun(input: {
  traceId: string;
  domain: string;
  path: string;
  groupId: GroupId;
  instruction: string;
  steps: AgentTraceStep[];
  finalPatch: PatchOperation[];
}): Promise<void> {
  const db = requireDb();

  const result = await db.collection("agent_runs").insertOne({
    traceId: input.traceId,
    userId: DEMO_USER_ID,
    domain: input.domain,
    path: input.path,
    groupId: input.groupId,
    instruction: input.instruction,
    steps: input.steps.map((s) => ({
      ...s,
      startedAt: new Date(s.startedAt),
      finishedAt: new Date(s.finishedAt),
    })),
    finalPatch: input.finalPatch,
    createdAt: new Date(),
  });

  console.log(
    `[mongo] saveAgentRun traceId=${input.traceId} insertedId=${String(result.insertedId)}`,
  );
}

export async function getAgentRuns(limit = 10): Promise<unknown[]> {
  const db = tryGetDb();
  if (!db) return [];

  const runs = await db
    .collection("agent_runs")
    .find({ userId: DEMO_USER_ID })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  console.log(`[mongo] getAgentRuns limit=${limit} returned=${runs.length}`);
  return runs;
}
