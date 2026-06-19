import type { Rect } from "../../../shared/contracts";

export type DragResizeState = {
  dragging: boolean;
  resizing: boolean;
  corner: string;
  startX: number;
  startY: number;
  startRect: Rect;
  startTranslate: { x: number; y: number };
  lastTranslate: { x: number; y: number };
  lastRect: Rect | null;
};

export function createDragState(): DragResizeState {
  return {
    dragging: false,
    resizing: false,
    corner: "",
    startX: 0,
    startY: 0,
    startRect: { x: 0, y: 0, width: 0, height: 0 },
    startTranslate: { x: 0, y: 0 },
    lastTranslate: { x: 0, y: 0 },
    lastRect: null,
  };
}

export function startDrag(state: DragResizeState, e: PointerEvent, rect: Rect, translate: { x: number; y: number }): void {
  state.dragging = true;
  state.startX = e.clientX;
  state.startY = e.clientY;
  state.startRect = { ...rect };
  state.startTranslate = { ...translate };
  state.lastTranslate = { ...translate };
  state.lastRect = { ...rect };
}

export function startResize(
  state: DragResizeState,
  corner: string,
  e: PointerEvent,
  rect: Rect,
): void {
  state.resizing = true;
  state.corner = corner;
  state.startX = e.clientX;
  state.startY = e.clientY;
  state.startRect = { ...rect };
  state.lastRect = { ...rect };
}

export function updateDrag(
  state: DragResizeState,
  e: PointerEvent,
): { translateX: number; translateY: number; rect: Rect } {
  const dx = e.clientX - state.startX;
  const dy = e.clientY - state.startY;
  const translateX = state.startTranslate.x + dx;
  const translateY = state.startTranslate.y + dy;
  const rect: Rect = {
    x: state.startRect.x + dx,
    y: state.startRect.y + dy,
    width: state.startRect.width,
    height: state.startRect.height,
  };
  state.lastTranslate = { x: translateX, y: translateY };
  state.lastRect = rect;
  return { translateX, translateY, rect };
}

export function updateResize(state: DragResizeState, e: PointerEvent): Rect {
  const dx = e.clientX - state.startX;
  const dy = e.clientY - state.startY;
  let { x, y, width, height } = state.startRect;

  if (state.corner.includes("e")) width = Math.max(40, state.startRect.width + dx);
  if (state.corner.includes("s")) height = Math.max(40, state.startRect.height + dy);
  if (state.corner.includes("w")) {
    width = Math.max(40, state.startRect.width - dx);
    x = state.startRect.x + (state.startRect.width - width);
  }
  if (state.corner.includes("n")) {
    height = Math.max(40, state.startRect.height - dy);
    y = state.startRect.y + (state.startRect.height - height);
  }

  const rect = { x, y, width, height };
  state.lastRect = rect;
  return rect;
}

export function endDragResize(state: DragResizeState): void {
  state.dragging = false;
  state.resizing = false;
  state.corner = "";
}
