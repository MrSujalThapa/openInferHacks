import type { DomElementSummary, Point, Rect, TargetSignature } from "../../../shared/contracts";

const GENIE_ATTR = "data-genie-ui";
const IGNORE_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "IFRAME"]);

export function isGenieElement(el: Element | null): boolean {
  if (!el) return true;
  if (el.closest(`[${GENIE_ATTR}]`)) return true;
  return false;
}

export function getVisibleRect(el: Element): Rect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return null;
  return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
}

export function summarizeElement(el: Element, index: number): DomElementSummary | null {
  const bbox = getVisibleRect(el);
  if (!bbox) return null;
  const style = window.getComputedStyle(el);
  const text = (el.textContent ?? "").trim().slice(0, 120);
  return {
    localId: `el_${index}`,
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute("role") ?? undefined,
    text: text || undefined,
    classHint: typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(" ") : undefined,
    ariaLabel: el.getAttribute("aria-label") ?? undefined,
    bbox,
    computedStyle: {
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontSize: style.fontSize,
      display: style.display,
    },
  };
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.0001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonBounds(points: Point[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

export function samplePointsInPolygon(polygon: Point[], step = 24): Point[] {
  const bounds = polygonBounds(polygon);
  const points: Point[] = [];
  for (let x = bounds.x; x <= bounds.x + bounds.width; x += step) {
    for (let y = bounds.y; y <= bounds.y + bounds.height; y += step) {
      const p = { x, y };
      if (pointInPolygon(p, polygon)) points.push(p);
    }
  }
  return points;
}

export function collectElementsFromLasso(polygon: Point[]): Element[] {
  const samplePoints = samplePointsInPolygon(polygon);
  const seen = new Set<Element>();
  const elements: Element[] = [];

  for (const p of samplePoints) {
    const stack = document.elementsFromPoint(p.x - window.scrollX, p.y - window.scrollY);
    for (const el of stack) {
      if (IGNORE_TAGS.has(el.tagName) || isGenieElement(el)) continue;
      if (seen.has(el)) continue;
      const rect = getVisibleRect(el);
      if (!rect || rect.width < 20 || rect.height < 20) continue;
      seen.add(el);
      elements.push(el);
    }
  }
  return elements;
}

const CONTAINER_TAGS = new Set(["ARTICLE", "ASIDE", "SECTION", "MAIN", "NAV", "DIV", "FORM"]);

export function findBestGroupContainer(elements: Element[]): Element | null {
  if (!elements.length) return null;

  const counts = new Map<Element, number>();
  for (const el of elements) {
    let cur: Element | null = el;
    while (cur && cur !== document.body) {
      counts.set(cur, (counts.get(cur) ?? 0) + 1);
      cur = cur.parentElement;
    }
  }

  let best: Element | null = null;
  let bestScore = -1;

  for (const [el, count] of counts) {
    if (!CONTAINER_TAGS.has(el.tagName)) continue;
    const rect = getVisibleRect(el);
    if (!rect) continue;
    const area = rect.width * rect.height;
    if (area < 4000) continue;
    const text = (el.textContent ?? "").trim().length;
    const coverage = count / elements.length;
    const score = coverage * 100 + Math.min(text, 200) + Math.log10(area);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best ?? elements[0]?.parentElement ?? elements[0] ?? null;
}

export function buildTargetSignature(el: Element): TargetSignature {
  const bbox = getVisibleRect(el)!;
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const tagHint = el.tagName.toLowerCase();
  const roleHint = el.getAttribute("role") ?? undefined;
  let selectorHint: string | undefined;
  if (el.id) selectorHint = `#${el.id}`;
  else if (el.className && typeof el.className === "string") {
    const cls = el.className.trim().split(/\s+/).slice(0, 2).join(".");
    if (cls) selectorHint = `${tagHint}.${cls}`;
  }

  return { textSignature: text || undefined, selectorHint, roleHint, tagHint, bbox };
}

export function resolveTargetElement(target: TargetSignature): Element | null {
  if (target.selectorHint) {
    try {
      const el = document.querySelector(target.selectorHint);
      if (el && getVisibleRect(el)) return el;
    } catch {
      /* invalid selector */
    }
  }

  const candidates = Array.from(document.querySelectorAll("article, aside, section, main, nav, div, form"));
  let best: Element | null = null;
  let bestScore = 0;

  for (const el of candidates) {
    if (isGenieElement(el)) continue;
    const rect = getVisibleRect(el);
    if (!rect) continue;

    let score = 0;
    const text = (el.textContent ?? "").trim();
    if (target.textSignature && text.includes(target.textSignature.slice(0, 40))) score += 50;

    const iou = bboxOverlap(rect, target.bbox);
    score += iou * 40;

    if (target.tagHint && el.tagName.toLowerCase() === target.tagHint) score += 5;
    if (target.roleHint && el.getAttribute("role") === target.roleHint) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return bestScore > 15 ? best : null;
}

function bboxOverlap(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

export function createGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export { GENIE_ATTR };
