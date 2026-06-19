import type { Point, Rect } from "../../../shared/contracts";
import { GENIE_ATTR } from "./grouping";

export type OverlayCallbacks = {
  onLassoComplete: (points: Point[]) => void;
  onBackgroundClick: () => void;
  onGroupDoubleClick: () => void;
};

export class Overlay {
  root: HTMLDivElement;
  svg: SVGSVGElement;
  hoverBox: HTMLDivElement;
  selectionBox: HTMLDivElement;
  labelTag: HTMLDivElement;
  sizeLabel: HTMLDivElement;

  private lassoPath: SVGPathElement;
  private handles: HTMLDivElement[] = [];
  private callbacks: OverlayCallbacks;
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

    this.selectionBox = document.createElement("div");
    this.selectionBox.className = "genie-selection-box";
    this.selectionBox.setAttribute(GENIE_ATTR, "selection");
    this.selectionBox.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.callbacks.onGroupDoubleClick();
    });

    this.labelTag = document.createElement("div");
    this.labelTag.className = "genie-label-tag";
    this.labelTag.setAttribute(GENIE_ATTR, "label");

    this.sizeLabel = document.createElement("div");
    this.sizeLabel.className = "genie-size-label";
    this.sizeLabel.setAttribute(GENIE_ATTR, "size");

    this.root.append(this.svg, this.hoverBox, this.selectionBox, this.labelTag, this.sizeLabel);

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

  showSelection(rect: Rect, label?: string): void {
    this.selectionBox.style.display = "block";
    this.updateSelectionRect(rect);

    this.labelTag.style.display = label ? "block" : "none";

    if (label) {
      this.labelTag.textContent = label;
      this.labelTag.style.transform = `translate(${rect.x - window.scrollX}px, ${
        rect.y - window.scrollY - 28
      }px)`;
    }

    this.sizeLabel.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    this.sizeLabel.style.display = "block";
    this.sizeLabel.style.transform = `translate(${
      rect.x - window.scrollX + rect.width / 2 - 40
    }px, ${rect.y - window.scrollY + rect.height + 8}px)`;
  }

  updateSelectionRect(rect: Rect): void {
    this.selectionBox.style.transform = `translate(${rect.x - window.scrollX}px, ${
      rect.y - window.scrollY
    }px)`;
    this.selectionBox.style.width = `${rect.width}px`;
    this.selectionBox.style.height = `${rect.height}px`;

    this.sizeLabel.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    this.sizeLabel.style.transform = `translate(${
      rect.x - window.scrollX + rect.width / 2 - 40
    }px, ${rect.y - window.scrollY + rect.height + 8}px)`;
  }

  hideSelection(): void {
    this.selectionBox.style.display = "none";
    this.labelTag.style.display = "none";
    this.sizeLabel.style.display = "none";
    this.clearHandles();
  }

  renderHandles(onHandleDown: (corner: string, event: PointerEvent) => void): void {
    this.clearHandles();

    const corners = ["nw", "ne", "sw", "se"];

    for (const corner of corners) {
      const handle = document.createElement("div");
      handle.className = `genie-handle genie-handle-${corner}`;
      handle.setAttribute(GENIE_ATTR, "handle");
      handle.dataset.corner = corner;

      handle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        onHandleDown(corner, event);
      });

      this.selectionBox.appendChild(handle);
      this.handles.push(handle);
    }
  }

  clearHandles(): void {
    for (const handle of this.handles) {
      handle.remove();
    }

    this.handles = [];
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