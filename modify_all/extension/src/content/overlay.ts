import type { Point, Rect } from "../../../shared/contracts";
import { GENIE_ATTR } from "./grouping";

export type OverlayCallbacks = {
  onLassoComplete: (points: Point[]) => void;
  onBackgroundClick: () => void;
  onGroupDoubleClick: (groupId: string) => void;
};

export type SelectionDisplay = {
  groupId: string;
  rect: Rect;
  label?: string;
  primary: boolean;
};

export type SelectionInteractionCallbacks = {
  onResizeHandle: (groupId: string, corner: string, event: PointerEvent) => void;
  onSelectionDragStart: (groupId: string, event: PointerEvent) => void;
};

export class Overlay {
  root: HTMLDivElement;
  svg: SVGSVGElement;
  hoverBox: HTMLDivElement;
  labelTag: HTMLDivElement;
  sizeLabel: HTMLDivElement;

  private lassoPath: SVGPathElement;
  private selectionBoxes = new Map<string, HTMLDivElement>();
  private selectionHandles = new Map<string, HTMLDivElement[]>();
  private callbacks: OverlayCallbacks;
  private interactionCallbacks: SelectionInteractionCallbacks | null = null;
  private readonly onWindowResize = (): void => this.resizeSvg();

  constructor(callbacks: OverlayCallbacks) {
    this.callbacks = callbacks;

    this.root = document.createElement("div");
    this.root.setAttribute(GENIE_ATTR, "overlay");
    this.root.className = "genie-overlay-root";

    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("genie-lasso-svg");

    this.lassoPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.lassoPath.setAttribute("fill", "rgba(56, 189, 248, 0.12)");
    this.lassoPath.setAttribute("stroke", "#38bdf8");
    this.lassoPath.setAttribute("stroke-width", "2");
    this.svg.appendChild(this.lassoPath);

    this.hoverBox = document.createElement("div");
    this.hoverBox.className = "genie-hover-box";
    this.hoverBox.setAttribute(GENIE_ATTR, "hover");

    this.labelTag = document.createElement("div");
    this.labelTag.className = "genie-label-tag";
    this.labelTag.setAttribute(GENIE_ATTR, "label");

    this.sizeLabel = document.createElement("div");
    this.sizeLabel.className = "genie-size-label";
    this.sizeLabel.setAttribute(GENIE_ATTR, "size");

    this.root.append(this.svg, this.hoverBox, this.labelTag, this.sizeLabel);

    this.root.addEventListener("click", (event) => {
      if (event.target === this.root || event.target === this.svg) {
        this.callbacks.onBackgroundClick();
      }
    });
  }

  mount(): void {
    document.documentElement.appendChild(this.root);
    this.resizeSvg();
    window.addEventListener("resize", this.onWindowResize);
  }

  unmount(): void {
    window.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private resizeSvg(): void {
    const width = document.documentElement.scrollWidth;
    const height = document.documentElement.scrollHeight;

    this.svg.setAttribute("width", String(width));
    this.svg.setAttribute("height", String(height));
    this.svg.style.width = `${width}px`;
    this.svg.style.height = `${height}px`;
  }

  showHover(rect: Rect): void {
    this.hoverBox.style.display = "block";
    this.hoverBox.style.transform = `translate(${rect.x - window.scrollX}px, ${
      rect.y - window.scrollY
    }px)`;
    this.hoverBox.style.width = `${rect.width}px`;
    this.hoverBox.style.height = `${rect.height}px`;
  }

  hideHover(): void {
    this.hoverBox.style.display = "none";
  }

  drawLasso(points: Point[]): void {
    if (points.length < 2) {
      this.lassoPath.setAttribute("d", "");
      return;
    }

    const path =
      points
        .map((point, index) => {
          const x = point.x - window.scrollX;
          const y = point.y - window.scrollY;
          return `${index === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ") + " Z";

    this.lassoPath.setAttribute("d", path);
  }

  clearLasso(): void {
    this.lassoPath.setAttribute("d", "");
  }

  syncSelections(
    selections: SelectionDisplay[],
    interactionCallbacks: SelectionInteractionCallbacks,
  ): void {
    this.interactionCallbacks = interactionCallbacks;
    const activeIds = new Set(selections.map((s) => s.groupId));

    for (const [groupId, box] of this.selectionBoxes) {
      if (!activeIds.has(groupId)) {
        this.clearHandles(groupId);
        box.remove();
        this.selectionBoxes.delete(groupId);
      }
    }

    const primary = selections.find((s) => s.primary) ?? selections[0];

    for (const sel of selections) {
      let box = this.selectionBoxes.get(sel.groupId);
      if (!box) {
        box = document.createElement("div");
        box.className = "genie-selection-box";
        box.setAttribute(GENIE_ATTR, "selection");
        box.dataset.genieGroupId = sel.groupId;

        box.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          this.callbacks.onGroupDoubleClick(sel.groupId);
        });

        box.addEventListener("pointerdown", (event) => {
          if ((event.target as Element).closest(".genie-handle")) return;
          event.stopPropagation();
          this.interactionCallbacks?.onSelectionDragStart(sel.groupId, event);
        });

        this.root.appendChild(box);
        this.selectionBoxes.set(sel.groupId, box);
      }

      box.classList.toggle("is-primary", sel.primary);
      box.classList.toggle("is-secondary", !sel.primary);
      this.updateBoxRect(box, sel.rect);

      if (sel.primary) {
        this.renderHandles(sel.groupId, box);
        if (sel.label) {
          this.labelTag.style.display = "block";
          this.labelTag.textContent = sel.label;
          this.labelTag.style.transform = `translate(${sel.rect.x - window.scrollX}px, ${
            sel.rect.y - window.scrollY - 28
          }px)`;
        } else {
          this.labelTag.style.display = "none";
        }

        this.sizeLabel.textContent = `${Math.round(sel.rect.width)} × ${Math.round(sel.rect.height)}`;
        this.sizeLabel.style.display = "block";
        this.sizeLabel.style.transform = `translate(${
          sel.rect.x - window.scrollX + sel.rect.width / 2 - 40
        }px, ${sel.rect.y - window.scrollY + sel.rect.height + 8}px)`;
      }
    }

    if (!primary) {
      this.labelTag.style.display = "none";
      this.sizeLabel.style.display = "none";
    }
  }

  updateSelectionRect(groupId: string, rect: Rect): void {
    const box = this.selectionBoxes.get(groupId);
    if (!box) return;

    this.updateBoxRect(box, rect);

    if (box.classList.contains("is-primary")) {
      this.sizeLabel.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      this.sizeLabel.style.transform = `translate(${
        rect.x - window.scrollX + rect.width / 2 - 40
      }px, ${rect.y - window.scrollY + rect.height + 8}px)`;
    }
  }

  hideAllSelections(): void {
    for (const groupId of this.selectionBoxes.keys()) {
      this.clearHandles(groupId);
    }
    for (const box of this.selectionBoxes.values()) {
      box.remove();
    }
    this.selectionBoxes.clear();
    this.labelTag.style.display = "none";
    this.sizeLabel.style.display = "none";
  }

  hideSelection(): void {
    this.hideAllSelections();
  }

  private updateBoxRect(box: HTMLDivElement, rect: Rect): void {
    box.style.display = "block";
    box.style.transform = `translate(${rect.x - window.scrollX}px, ${rect.y - window.scrollY}px)`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }

  private renderHandles(groupId: string, box: HTMLDivElement): void {
    this.clearHandles(groupId);

    const corners = ["nw", "ne", "sw", "se"];
    const handles: HTMLDivElement[] = [];

    for (const corner of corners) {
      const handle = document.createElement("div");
      handle.className = `genie-handle genie-handle-${corner}`;
      handle.setAttribute(GENIE_ATTR, "handle");
      handle.dataset.corner = corner;

      handle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        this.interactionCallbacks?.onResizeHandle(groupId, corner, event);
      });

      box.appendChild(handle);
      handles.push(handle);
    }

    this.selectionHandles.set(groupId, handles);
  }

  private clearHandles(groupId: string): void {
    const handles = this.selectionHandles.get(groupId);
    if (!handles) return;

    for (const handle of handles) {
      handle.remove();
    }
    this.selectionHandles.delete(groupId);
  }
}

export class LassoController {
  private active = false;
  private points: Point[] = [];

  start(x: number, y: number): void {
    this.active = true;
    this.points = [{ x: x + window.scrollX, y: y + window.scrollY }];
  }

  move(x: number, y: number): Point[] {
    if (!this.active) return this.points;

    this.points.push({ x: x + window.scrollX, y: y + window.scrollY });
    return this.points;
  }

  end(): Point[] {
    this.active = false;
    return this.points;
  }

  isActive(): boolean {
    return this.active;
  }

  reset(): void {
    this.active = false;
    this.points = [];
  }
}
