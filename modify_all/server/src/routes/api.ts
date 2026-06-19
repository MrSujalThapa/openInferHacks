import express from "express";
import type { EditableGroup, PatchOperation } from "../../../shared/contracts.js";
import { understandGroup, runSectionEditAgent } from "../agent/sectionEditAgent.js";
import { isMongoConnected } from "../mongo.js";
import {
  addStyleMemory,
  getAgentRuns,
  getCustomizations,
  getStyleMemory,
  saveCustomization,
} from "../repos/index.js";

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.post("/customizations", async (req, res) => {
  try {
    const { domain, pathPattern, groupId, target, operations, enabled } = req.body as {
      domain: string;
      pathPattern: string;
      groupId: string;
      target: EditableGroup["target"];
      operations: PatchOperation[];
      enabled: boolean;
    };
    const customizationId = await saveCustomization({
      domain,
      pathPattern,
      groupId,
      target,
      operations,
      enabled,
    });
    res.json({ ok: true, customizationId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.get("/customizations", async (req, res) => {
  try {
    const domain = String(req.query.domain ?? "");
    const path = String(req.query.path ?? "");
    const customizations = await getCustomizations(domain, path);
    res.json({ customizations });
  } catch (err) {
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
    const runs = await getAgentRuns(limit);
    res.json({ runs });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
