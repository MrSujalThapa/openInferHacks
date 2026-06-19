# 04 — MongoDB Data Models

Database: `genie_mvp`

No auth. All documents use `userId: "demo-user"`.

## Collection: `groups`

Stores user-created lasso/rectangle groups.

```ts
type GroupDoc = {
  _id: ObjectId;
  groupId: string;
  userId: "demo-user";
  domain: string;
  path: string;
  label?: string;
  shape: {
    type: "rectangle" | "lasso";
    rect: { x: number; y: number; width: number; height: number };
    points?: { x: number; y: number }[];
  };
  target: {
    textSignature?: string;
    selectorHint?: string;
    roleHint?: string;
    tagHint?: string;
    bbox: { x: number; y: number; width: number; height: number };
  };
  domSummary: unknown[];
  createdAt: Date;
  updatedAt: Date;
};
```

Indexes:

```js
db.groups.createIndex({ userId: 1, domain: 1, path: 1 });
db.groups.createIndex({ groupId: 1 }, { unique: true });
```

## Collection: `customizations`

Stores saved frontend patch operations.

```ts
type CustomizationDoc = {
  _id: ObjectId;
  customizationId: string;
  userId: "demo-user";
  domain: string;
  pathPattern: string;
  groupId: string;
  target: TargetSignature;
  operations: PatchOperation[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

Indexes:

```js
db.customizations.createIndex({ userId: 1, domain: 1, pathPattern: 1, enabled: 1 });
db.customizations.createIndex({ customizationId: 1 }, { unique: true });
```

## Collection: `agent_runs`

Stores OpenInfer/LangGraph traces for demo proof and debugging.

```ts
type AgentRunDoc = {
  _id: ObjectId;
  traceId: string;
  userId: "demo-user";
  domain: string;
  path: string;
  groupId: string;
  instruction: string;
  steps: {
    name: string;
    status: "success" | "failed" | "skipped";
    inputPreview?: unknown;
    outputPreview?: unknown;
    error?: string;
    startedAt: Date;
    finishedAt: Date;
  }[];
  finalPatch: PatchOperation[];
  createdAt: Date;
};
```

Indexes:

```js
db.agent_runs.createIndex({ userId: 1, createdAt: -1 });
db.agent_runs.createIndex({ traceId: 1 }, { unique: true });
```

## Collection: `style_memory`

Stores concise interface preferences inferred from saved edits.

```ts
type StyleMemoryDoc = {
  _id: ObjectId;
  userId: "demo-user";
  content: string;
  source: "manual" | "agent_save" | "demo_seed";
  createdAt: Date;
  updatedAt: Date;
};
```

Indexes:

```js
db.style_memory.createIndex({ userId: 1, updatedAt: -1 });
```

## Seed memory for demo

```json
{
  "userId": "demo-user",
  "content": "User prefers compact dark-mode sections, softer contrast, and fewer distracting sidebar modules.",
  "source": "demo_seed"
}
```
