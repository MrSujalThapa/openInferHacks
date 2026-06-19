import type { PatchOperation } from "../../../shared/contracts";

type AppliedState = {
  element: HTMLElement;
  originalStyle: Record<string, string>;
  hidden: boolean;
};

const applied = new Map<string, AppliedState>();

function storeOriginal(el: HTMLElement, key: string): AppliedState {
  const existing = applied.get(key);
  if (existing) return existing;

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
  ]) {
    originalStyle[prop] = el.style.getPropertyValue(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)) || "";
  }

  const state: AppliedState = { element: el, originalStyle, hidden: false };
  applied.set(key, state);
  return state;
}

export function applyOperations(
  groupId: string,
  element: HTMLElement,
  operations: PatchOperation[],
): void {
  const state = storeOriginal(element, groupId);
  let translateX = 0;
  let translateY = 0;

  for (const op of operations) {
    if (op.targetId !== groupId) continue;

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
        if (op.width) element.style.width = `${op.width}px`;
        if (op.height) element.style.height = `${op.height}px`;
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

  if (translateX || translateY) {
    element.style.transform = `translate(${translateX}px, ${translateY}px)`;
  }
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
  applied.delete(groupId);
}

export function getElementTransform(element: HTMLElement): { x: number; y: number } {
  const match = element.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  return { x: match ? parseFloat(match[1]) : 0, y: match ? parseFloat(match[2]) : 0 };
}

export function buildOperationsFromManualEdit(
  groupId: string,
  element: HTMLElement,
  baseOps: PatchOperation[],
): PatchOperation[] {
  const ops = [...baseOps.filter((o) => !["move", "resize", "style"].includes(o.type))];
  const rect = element.getBoundingClientRect();
  const { x, y } = getElementTransform(element);

  if (x || y) {
    ops.push({ type: "move", targetId: groupId, translateX: x, translateY: y });
  }
  if (element.style.width) {
    ops.push({ type: "resize", targetId: groupId, width: rect.width, height: rect.height });
  }

  return ops;
}
