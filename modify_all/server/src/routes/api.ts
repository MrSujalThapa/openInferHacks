import express from "express";
import type { EditableGroup } from "../../../shared/contracts.js";
import { understandGroup, runSectionEditAgent } from "../agent/sectionEditAgent.js";
import { isMongoConnected } from "../db/mongo.js";
import {
  addStyleMemory,
  getAgentRuns,
  getStyleMemory,
} from "../db/repositories.js";

export const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, mongo: isMongoConnected() ? "connected" : "disconnected" });
});

apiRouter.post("/groups/understand", async (req, res) => {
  try {
    const { domain, path, group } = req.body as {
      domain: string;
      path: string;
      group: Partial<EditableGroup> & { groupId: string; target: EditableGroup["target"]; domSummary: EditableGroup["domSummary"] };
    };
    const result = await understandGroup({ domain, path, group });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.post("/agent/section-edit", async (req, res) => {
  try {
    const { domain, path, group, instruction } = req.body as {
      domain: string;
      path: string;
      group: EditableGroup;
      instruction: string;
    };

    console.log("[api] POST /api/agent/section-edit", {
      domain,
      path,
      groupId: group?.groupId,
      instruction: instruction?.slice(0, 80),
    });

    const now = new Date().toISOString();
    const fullGroup: EditableGroup = {
      ...group,
      userId: "demo-user",
      domain,
      path,
      createdAt: group.createdAt ?? now,
      updatedAt: now,
    };

    const result = await runSectionEditAgent({ domain, path, group: fullGroup, instruction });
    console.log("[api] POST /api/agent/section-edit completed", {
      traceId: result.traceId,
      operationCount: result.operations.length,
    });
    res.json(result);
  } catch (err) {
    console.error("[api] POST /api/agent/section-edit failed:", err);
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.get("/style-memory", async (_req, res) => {
  try {
    const contents = await getStyleMemory();
    res.json({ memories: contents.map((content) => ({ content })) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.post("/style-memory", async (req, res) => {
  try {
    const { content } = req.body as { content: string };
    await addStyleMemory(content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.get("/agent-runs", async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    console.log("[api] GET /api/agent-runs", { limit });
    const runs = await getAgentRuns(limit);
    res.json({ runs });
  } catch (err) {
    console.error("[api] GET /api/agent-runs failed:", err);
    res.status(500).json({ error: String(err) });
  }
});
