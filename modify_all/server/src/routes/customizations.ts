import { randomUUID } from "node:crypto";
import { Router } from "express";
import type {
  AllowedCssProperty,
  PatchOperation,
  SiteCustomization,
  TargetSignature,
} from "../../../shared/contracts.js";
import { getRepositories } from "../db/repositories.js";

const DEMO_USER_ID = "demo-user" as const;
const ALLOWED_CSS_PROPERTIES: ReadonlySet<AllowedCssProperty> = new Set([
  "backgroundColor",
  "color",
  "borderRadius",
  "opacity",
  "fontSize",
  "padding",
  "margin",
  "boxShadow",
  "border",
  "overflow",
]);

type SaveCustomizationBody = {
  domain?: unknown;
  pathPattern?: unknown;
  groupId?: unknown;
  target?: unknown;
  operations?: unknown;
  enabled?: unknown;
};

export const customizationsRouter = Router();

customizationsRouter.post("/", async (request, response) => {
  const parsed = parseSaveCustomizationBody(request.body);

  if (!parsed.ok) {
    response.status(400).json({ ok: false, error: parsed.error });
    return;
  }

  try {
    const repositories = getRepositories();
    const now = new Date();
    const existing = await repositories.customizations.findOne({
      userId: DEMO_USER_ID,
      domain: parsed.value.domain,
      pathPattern: parsed.value.pathPattern,
      groupId: parsed.value.groupId,
    });

    const customizationId =
      typeof existing?.customizationId === "string"
        ? existing.customizationId
        : `custom_${randomUUID()}`;

    await repositories.customizations.updateOne(
      {
        userId: DEMO_USER_ID,
        domain: parsed.value.domain,
        pathPattern: parsed.value.pathPattern,
        groupId: parsed.value.groupId,
      },
      {
        $set: {
          customizationId,
          userId: DEMO_USER_ID,
          domain: parsed.value.domain,
          pathPattern: parsed.value.pathPattern,
          groupId: parsed.value.groupId,
          target: parsed.value.target,
          operations: parsed.value.operations,
          enabled: parsed.value.enabled,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    response.json({ ok: true, customizationId });
  } catch (error) {
    response.status(503).json({
      ok: false,
      error: "MongoDB is unavailable",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

customizationsRouter.get("/", async (request, response) => {
  const domain = readRequiredQueryString(request.query.domain, "domain");
  const path = readRequiredQueryString(request.query.path, "path");

  if (!domain.ok) {
    response.status(400).json({ ok: false, error: domain.error });
    return;
  }

  if (!path.ok) {
    response.status(400).json({ ok: false, error: path.error });
    return;
  }

  try {
    const repositories = getRepositories();
    const docs = await repositories.customizations
      .find({
        userId: DEMO_USER_ID,
        domain: domain.value,
        enabled: true,
        $or: [{ pathPattern: path.value }, { pathPattern: "*" }],
      })
      .sort({ updatedAt: -1 })
      .toArray();

    const customizations = docs.map((doc) => ({
      customizationId: String(doc.customizationId),
      groupId: String(doc.groupId),
      target: doc.target as TargetSignature,
      operations: doc.operations as PatchOperation[],
      enabled: Boolean(doc.enabled),
    }));

    response.json({ customizations });
  } catch (error) {
    response.status(503).json({
      ok: false,
      error: "MongoDB is unavailable",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

function parseSaveCustomizationBody(
  body: SaveCustomizationBody,
):
  | { ok: true; value: Omit<SiteCustomization, "customizationId" | "userId" | "createdAt" | "updatedAt"> }
  | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const domain = readRequiredString(body.domain, "domain");
  if (!domain.ok) return domain;

  const pathPattern = readRequiredString(body.pathPattern, "pathPattern");
  if (!pathPattern.ok) return pathPattern;

  const groupId = readRequiredString(body.groupId, "groupId");
  if (!groupId.ok) return groupId;

  if (!isTargetSignature(body.target)) {
    return { ok: false, error: "target must include bbox with x, y, width, and height" };
  }

  if (!Array.isArray(body.operations)) {
    return { ok: false, error: "operations must be an array" };
  }

  if (!body.operations.every((operation) => isPatchOperationLike(operation, groupId.value))) {
    return { ok: false, error: "operations contains an invalid patch operation" };
  }

  return {
    ok: true,
    value: {
      domain: domain.value,
      pathPattern: pathPattern.value,
      groupId: groupId.value,
      target: body.target,
      operations: body.operations,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
    },
  };
}

function readRequiredQueryString(
  value: unknown,
  fieldName: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (Array.isArray(value)) {
    return { ok: false, error: `${fieldName} must be a single string` };
  }

  return readRequiredString(value, fieldName);
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${fieldName} is required` };
  }

  return { ok: true, value: value.trim() };
}

function isTargetSignature(value: unknown): value is TargetSignature {
  if (!isRecord(value) || !isRecord(value.bbox)) {
    return false;
  }

  return (
    isFiniteNumber(value.bbox.x) &&
    isFiniteNumber(value.bbox.y) &&
    isFiniteNumber(value.bbox.width) &&
    isFiniteNumber(value.bbox.height)
  );
}

function isPatchOperationLike(value: unknown, groupId: string): value is PatchOperation {
  if (!isRecord(value) || typeof value.type !== "string" || typeof value.targetId !== "string") {
    return false;
  }

  if (value.targetId !== groupId) {
    return false;
  }

  if (value.type === "hide" || value.type === "compact") {
    return true;
  }

  if (value.type === "move") {
    return optionalFiniteNumber(value.translateX) && optionalFiniteNumber(value.translateY);
  }

  if (value.type === "resize") {
    return optionalPositiveNumber(value.width) && optionalPositiveNumber(value.height);
  }

  if (value.type === "style") {
    return isRecord(value.css) && Object.keys(value.css).every((property) => {
      return ALLOWED_CSS_PROPERTIES.has(property as AllowedCssProperty);
    });
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function optionalPositiveNumber(value: unknown): boolean {
  return value === undefined || (isFiniteNumber(value) && value > 0);
}
