import type { AllowedCssProperty, GroupId, PatchOperation } from "../../../shared/contracts.js";
import { ALLOWED_CSS_PROPERTIES } from "../../../shared/contracts.js";

const UNSAFE_PATTERNS = [
  /javascript:/i,
  /<script/i,
  /url\s*\(/i,
  /expression\s*\(/i,
  /@import/i,
];

export function validatePatchOperations(
  operations: PatchOperation[],
  groupId: GroupId,
): { valid: PatchOperation[]; rejected: string[] } {
  const valid: PatchOperation[] = [];
  const rejected: string[] = [];

  for (const op of operations) {
    if (!op.targetId) {
      rejected.push("missing targetId");
      continue;
    }
    if (op.targetId !== groupId) {
      rejected.push(`targetId ${op.targetId} does not match group ${groupId}`);
      continue;
    }

    switch (op.type) {
      case "style": {
        const css = op.css ?? {};
        let safe = true;
        for (const [key, value] of Object.entries(css)) {
          if (!ALLOWED_CSS_PROPERTIES.includes(key as AllowedCssProperty)) {
            rejected.push(`CSS property not allowed: ${key}`);
            safe = false;
            break;
          }
          if (typeof value === "string" && UNSAFE_PATTERNS.some((p) => p.test(value))) {
            rejected.push(`Unsafe CSS value for ${key}`);
            safe = false;
            break;
          }
        }
        if (safe) valid.push(op);
        break;
      }
      case "move": {
        const tx = op.translateX ?? 0;
        const ty = op.translateY ?? 0;
        if (Math.abs(tx) > 1000 || Math.abs(ty) > 1000) {
          rejected.push("move values too extreme");
        } else {
          valid.push(op);
        }
        break;
      }
      case "resize": {
        const w = op.width ?? 0;
        const h = op.height ?? 0;
        if (w < 20 || w > 5000 || h < 20 || h > 5000) {
          rejected.push("resize dimensions out of range");
        } else {
          valid.push(op);
        }
        break;
      }
      case "hide":
      case "compact":
        valid.push(op);
        break;
      default:
        rejected.push("unknown operation type");
    }
  }

  return { valid, rejected };
}

export function parsePatchOperations(raw: unknown, groupId: GroupId): PatchOperation[] {
  if (!Array.isArray(raw)) return [];
  const { valid } = validatePatchOperations(raw as PatchOperation[], groupId);
  return valid;
}
