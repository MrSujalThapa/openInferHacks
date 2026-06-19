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
import { getDb } from "../mongo.js";

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getStyleMemory(userId: UserId = DEMO_USER_ID): Promise<string[]> {
  const db = getDb();
  if (!db) {
    return ["User prefers compact dark-mode sections, softer contrast, and fewer distracting sidebar modules."];
  }
  const docs = await db
    .collection("style_memory")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();
  return docs.map((d) => d.content as string);
}

export async function addStyleMemory(content: string, userId: UserId = DEMO_USER_ID): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.collection("style_memory").insertOne({
    userId,
    content,
    source: "manual",
    createdAt: new Date(),
    updatedAt: new Date(),
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
  const customizationId = id("custom");
  const db = getDb();
  const now = new Date();
  const doc: SiteCustomization = {
    customizationId,
    userId: DEMO_USER_ID,
    domain: input.domain,
    pathPattern: input.pathPattern,
    groupId: input.groupId,
    target: input.target,
    operations: input.operations,
    enabled: input.enabled,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (!db) return customizationId;

  await db.collection("customizations").updateOne(
    { userId: DEMO_USER_ID, domain: input.domain, pathPattern: input.pathPattern, groupId: input.groupId },
    {
      $set: {
        ...doc,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return customizationId;
}

export async function getCustomizations(domain: string, path: string): Promise<SiteCustomization[]> {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  if (!db) return;
  await db.collection("agent_runs").insertOne({
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
}

export async function getAgentRuns(limit = 10): Promise<unknown[]> {
  const db = getDb();
  if (!db) return [];
  return db
    .collection("agent_runs")
    .find({ userId: DEMO_USER_ID })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
