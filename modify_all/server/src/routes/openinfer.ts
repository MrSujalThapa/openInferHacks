import { Router } from "express";
import { config } from "../config.js";
import { OpenInferClient } from "../agent/openinferClient.js";

const TEST_PROMPT =
  "Reply with exactly this JSON object and no extra text: {\"ok\":true,\"message\":\"openinfer-ready\"}";

export const openInferRouter = Router();

openInferRouter.get("/status", (_request, response) => {
  const client = new OpenInferClient({
    baseUrl: config.openinferBaseUrl,
    apiKey: config.openinferApiKey,
    model: config.openinferModel,
  });

  response.json(client.getStatus());
});

openInferRouter.post("/test", async (request, response) => {
  const client = new OpenInferClient({
    baseUrl: config.openinferBaseUrl,
    apiKey: config.openinferApiKey,
    model: config.openinferModel,
  });

  const status = client.getStatus();
  if (!status.configured) {
    response.status(503).json({
      ok: false,
      error: "OpenInfer is not configured",
      requiredEnv: ["OPENINFER_BASE_URL", "OPENINFER_API_KEY", "OPENINFER_MODEL"],
    });
    return;
  }

  const input = readOptionalPrompt(request.body) ?? TEST_PROMPT;

  try {
    const result = await client.generateText({
      input,
      temperature: 0,
      maxOutputTokens: 128,
    });

    response.json({
      ok: true,
      model: status.model,
      rawEventCount: result.rawEventCount,
      text: result.text,
    });
  } catch (error) {
    response.status(502).json({
      ok: false,
      error: "OpenInfer test call failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

function readOptionalPrompt(body: unknown): string | undefined {
  if (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    "prompt" in body &&
    typeof body.prompt === "string" &&
    body.prompt.trim().length > 0
  ) {
    return body.prompt.trim();
  }

  return undefined;
}

