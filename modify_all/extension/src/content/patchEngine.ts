import type { PatchOperation } from "../../../shared/contracts";

const BASE_WIDTH_ATTR = "data-genie-base-width";
const BASE_HEIGHT_ATTR = "data-genie-base-height";

type AppliedState = {
  element: HTMLElement;
  originalStyle: Record<string, string>;
  hidden: boolean;
  baseWidth: number;
  baseHeight: number;
};

const applied = new Map<string, AppliedState>();

function resetToOriginal(state: AppliedState): void {
  const { element, originalStyle } = state;
  element.style.cssText = "";
  for (const [prop, value] of Object.entries(originalStyle)) {
    if (value) {
      (element.style as unknown as Record<string, string>)[prop] = value;
    }
  }
  delete element.dataset.genieBaseWidth;
  delete element.dataset.genieBaseHeight;
}

export function normalizeOperationsForGroup(
  groupId: string,
  operations: PatchOperation[],
): PatchOperation[] {
  return operations.map((op) => ({ ...op, targetId: groupId }));
}

function storeOriginal(el: HTMLElement, key: string): AppliedState {
  const existing = applied.get(key);
  if (existing) return existing;

  const rect = el.getBoundingClientRect();
  const originalStyle: Record<string, string> = {};
  for (const prop of [
    "transform",
    "width",
    "height",
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
    "display",
    "transformOrigin",
  ]) {
    originalStyle[prop] =
      el.style.getPropertyValue(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)) || "";
  }

  const state: AppliedState = {
    element: el,
    originalStyle,
    hidden: false,
    baseWidth: rect.width,
    baseHeight: rect.height,
  };
  applied.set(key, state);
  return state;
}

export type ElementLayout = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  baseWidth: number;
  baseHeight: number;
  visualWidth: number;
  visualHeight: number;
};

export function getLayoutBase(element: HTMLElement): { width: number; height: number } {
  const storedW = parseFloat(element.dataset.genieBaseWidth ?? "");
  const storedH = parseFloat(element.dataset.genieBaseHeight ?? "");
  if (storedW > 0 && storedH > 0) {
    return { width: storedW, height: storedH };
  }

  const rect = element.getBoundingClientRect();
  const layout = parseTransformParts(element.style.transform);
  const baseW = layout.scaleX > 0 ? rect.width / layout.scaleX : rect.width;
  const baseH = layout.scaleY > 0 ? rect.height / layout.scaleY : rect.height;
  return { width: baseW, height: baseH };
}

export function ensureLayoutBase(element: HTMLElement): { width: number; height: number } {
  const base = getLayoutBase(element);
  element.dataset.genieBaseWidth = String(Math.round(base.width));
  element.dataset.genieBaseHeight = String(Math.round(base.height));
  return base;
}

function parseTransformParts(transform: string): {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
} {
  let translateX = 0;
  let translateY = 0;
  let scaleX = 1;
  let scaleY = 1;

  const translateMatch = transform.match(
    /translate(?:3d)?\(([-\d.]+)px(?:,\s*([-\d.]+)px)?(?:,\s*[-\d.]+px)?\)/,
  );
  if (translateMatch) {
    translateX = parseFloat(translateMatch[1]);
    translateY = translateMatch[2] ? parseFloat(translateMatch[2]) : 0;
  }

  const scaleMatch = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
  if (scaleMatch) {
    scaleX = parseFloat(scaleMatch[1]);
    scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;
  }

  return { translateX, translateY, scaleX, scaleY };
}

export function parseElementLayout(element: HTMLElement): ElementLayout {
  const base = getLayoutBase(element);
  const parts = parseTransformParts(element.style.transform);
  return {
    translateX: parts.translateX,
    translateY: parts.translateY,
    scaleX: parts.scaleX,
    scaleY: parts.scaleY,
    baseWidth: base.width,
    baseHeight: base.height,
    visualWidth: base.width * parts.scaleX,
    visualHeight: base.height * parts.scaleY,
  };
}

export function applyVisualLayout(
  element: HTMLElement,
  layout: {
    translateX?: number;
    translateY?: number;
    visualWidth?: number;
    visualHeight?: number;
  },
): void {
  const base = ensureLayoutBase(element);
  const current = parseElementLayout(element);

  const translateX = layout.translateX ?? current.translateX;
  const translateY = layout.translateY ?? current.translateY;
  const visualWidth = layout.visualWidth ?? current.visualWidth;
  const visualHeight = layout.visualHeight ?? current.visualHeight;

  const scaleX = base.width > 0 ? visualWidth / base.width : 1;
  const scaleY = base.height > 0 ? visualHeight / base.height : 1;

  element.style.width = `${base.width}px`;
  element.style.height = `${base.height}px`;
  element.style.transformOrigin = "top left";
  element.style.overflow = "hidden";

  const parts: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    parts.push(`translate(${translateX}px, ${translateY}px)`);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    parts.push(`scale(${scaleX}, ${scaleY})`);
  }
  element.style.transform = parts.length > 0 ? parts.join(" ") : "none";
}

export function applyOperations(
  groupId: string,
  element: HTMLElement,
  operations: PatchOperation[],
): void {
  const state = storeOriginal(element, groupId);
  resetToOriginal(state);
  state.hidden = false;

  ensureLayoutBase(element);

  const ops = normalizeOperationsForGroup(groupId, operations);
  let translateX = 0;
  let translateY = 0;
  let visualWidth: number | undefined;
  let visualHeight: number | undefined;

  for (const op of ops) {
    switch (op.type) {
      case "style":
        for (const [key, value] of Object.entries(op.css)) {
          if (value !== undefined) {
            (element.style as unknown as Record<string, string>)[key] = value;
          }
        }
        break;
      case "move":
        translateX += op.translateX ?? 0;
        translateY += op.translateY ?? 0;
        break;
      case "resize":
        if (op.width) visualWidth = op.width;
        if (op.height) visualHeight = op.height;
        break;
      case "hide":
        element.style.display = "none";
        state.hidden = true;
        break;
      case "compact":
        element.style.padding = "8px";
        element.style.fontSize = "13px";
        element.style.margin = "4px 0";
        element.style.overflow = "hidden";
        break;
    }
  }

  applyVisualLayout(element, {
    translateX,
    translateY,
    visualWidth,
    visualHeight,
  });
}

export function revertGroup(groupId: string): void {
  const state = applied.get(groupId);
  if (!state) return;
  const { element, originalStyle } = state;
  element.style.cssText = "";
  for (const [prop, value] of Object.entries(originalStyle)) {
    if (value) {
      (element.style as unknown as Record<string, string>)[prop] = value;
    }
  }
  delete element.dataset.genieBaseWidth;
  delete element.dataset.genieBaseHeight;
  applied.delete(groupId);
}

export function getElementTransform(element: HTMLElement): { x: number; y: number } {
  const layout = parseElementLayout(element);
  return { x: layout.translateX, y: layout.translateY };
}

export type ManualEditHint = {
  translate?: { x: number; y: number };
  rect?: { width: number; height: number };
};

export function buildOperationsFromManualEdit(
  groupId: string,
  element: HTMLElement,
  baseOps: PatchOperation[],
  hint?: ManualEditHint,
): PatchOperation[] {
  const ops = baseOps.filter((o) => o.type !== "move" && o.type !== "resize");

  const layout = parseElementLayout(element);
  const transform = hint?.translate ?? { x: layout.translateX, y: layout.translateY };
  const hasMove = Math.abs(transform.x) > 0.5 || Math.abs(transform.y) > 0.5;
  if (hasMove) {
    ops.push({
      type: "move",
      targetId: groupId,
      translateX: Math.round(transform.x),
      translateY: Math.round(transform.y),
    });
  }

  const visualWidth = hint?.rect?.width ?? layout.visualWidth;
  const visualHeight = hint?.rect?.height ?? layout.visualHeight;
  const hasResize =
    Math.abs(visualWidth - layout.baseWidth) > 1 || Math.abs(visualHeight - layout.baseHeight) > 1;

  if (hasResize) {
    ops.push({
      type: "resize",
      targetId: groupId,
      width: Math.round(visualWidth),
      height: Math.round(visualHeight),
    });
  }

  return ops;
}
