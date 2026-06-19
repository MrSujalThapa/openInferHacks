import { Router } from "express";
import { getMongoDiagnostics, pingMongo } from "../db/mongo.js";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  const mongo = await pingMongo();
  const diagnostics = getMongoDiagnostics();

  response.json({
    ok: mongo === "connected" || mongo === "not_configured",
    mongo,
    ...(diagnostics.error ? { error: diagnostics.error } : {}),
  });
});

