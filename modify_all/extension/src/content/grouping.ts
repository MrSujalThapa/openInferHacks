import type { DomElementSummary, Point, Rect, TargetSignature } from "../../../shared/contracts";

const GENIE_ATTR = "data-genie-ui";
const IGNORE_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "IFRAME"]);
const ROOT_TAGS = new Set(["HTML", "BODY"]);

const SEMANTIC_TAGS = new Set(["ARTICLE", "ASIDE", "SECTION"]);
const SEMANTIC_ROLES = new Set(["article", "complementary", "region"]);
const BROAD_TAGS = new Set(["MAIN", "NAV"]);

const USEFUL_HINT_RE =
  /\b(card|panel|sidebar|news|feed|post|profile|widget|module|composer|puzzle|saved)\b/i;
const HUGE_WRAPPER_HINT_RE =
  /\b(page-layout|app-root|site-root|left-rail|right-rail|page-wrapper|layout-wrapper)\b/i;

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

export function area(rect: Rect): number {
  return rect.width * rect.height;
}

export function intersectionRatio(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const minArea = Math.min(area(a), area(b));
  return minArea > 0 ? inter / minArea : 0;
}

export function isExcludedElement(el: Element): boolean {
  if (IGNORE_TAGS.has(el.tagName) || ROOT_TAGS.has(el.tagName)) return true;
  if (el === document.documentElement || el === document.body) return true;
  return isGenieElement(el);
}

export function isUsefulContainer(el: Element): boolean {
  if (SEMANTIC_TAGS.has(el.tagName)) return true;

  const role = el.getAttribute("role");
  if (role && SEMANTIC_ROLES.has(role)) return true;

  const id = el.id;
  const className = typeof el.className === "string" ? el.className : "";
  const hint = `${id} ${className}`;
  if (USEFUL_HINT_RE.test(hint)) return true;

  if (el.hasAttribute("aria-label") && getVisibleRect(el) && !BROAD_TAGS.has(el.tagName)) return true;

  return false;
}

export function isHugeWrapper(el: Element, lassoRect: Rect): boolean {
  if (el === document.body || el === document.documentElement) return true;

  const rect = getVisibleRect(el);
  if (!rect) return true;

  const elArea = area(rect);
  const lassoArea = area(lassoRect);
  if (lassoArea > 0 && elArea > lassoArea * 2.5) return true;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (rect.width > vw * 0.9 && lassoRect.width < vw * 0.6) return true;
  if (rect.height > vh * 0.8 && lassoRect.height < vh * 0.6) return true;

  const id = el.id;
  const className = typeof el.className === "string" ? el.className : "";
  const hint = `${id} ${className}`;
  if (/^(app|root)$/i.test(id) || HUGE_WRAPPER_HINT_RE.test(hint)) return true;

  return false;
}

export function scoreContainer(
  el: Element,
  lassoRect: Rect,
  selectedElements: Element[],
): number {
  const rect = getVisibleRect(el);
  if (!rect) return -Infinity;

  const elArea = area(rect);
  const lassoArea = area(lassoRect);
  let score = 0;

  score += intersectionRatio(rect, lassoRect) * 100;

  if (isUsefulContainer(el)) score += 40;

  if (lassoArea > 0) {
    const areaRatio = elArea / lassoArea;
    if (areaRatio <= 1.2) score += 30;
    else if (areaRatio <= 2) score += 15;
    else if (areaRatio <= 2.5) score += 5;
    else score -= 25;
  }

  score -= Math.log10(Math.max(elArea, 1)) * 2;

  if (selectedElements.length > 0) {
    const contained = selectedElements.filter((node) => el.contains(node)).length;
    score += (contained / selectedElements.length) * 50;
  }

  if (el.tagName === "DIV" && !isUsefulContainer(el)) score -= 15;
  if (BROAD_TAGS.has(el.tagName)) score -= 20;

  return score;
}

function findNearestUsefulContainer(el: Element, lassoRect: Rect): Element | null {
  let cur: Element | null = el;
  let fallback: Element | null = null;

  while (cur && !isExcludedElement(cur)) {
    if (isHugeWrapper(cur, lassoRect)) break;

    const rect = getVisibleRect(cur);
    if (!rect) {
      cur = cur.parentElement;
      continue;
    }

    if (!fallback && !BROAD_TAGS.has(cur.tagName)) fallback = cur;
    if (isUsefulContainer(cur)) return cur;

    cur = cur.parentElement;
  }

  if (fallback && !BROAD_TAGS.has(fallback.tagName)) return fallback;
  return el;
}

export function pickContainerAtPoint(clientX: number, clientY: number): HTMLElement | null {
  const x = clientX + window.scrollX;
  const y = clientY + window.scrollY;
  const lassoRect = { x: x - 2, y: y - 2, width: 4, height: 4 };
  const stack = document.elementsFromPoint(clientX, clientY);

  for (const el of stack) {
    if (isExcludedElement(el)) continue;
    const container = findNearestUsefulContainer(el, lassoRect) ?? el;
    if (container instanceof HTMLElement && getVisibleRect(container)) {
      return container;
    }
  }

  return null;
}

function collectAncestorCandidates(
  el: Element,
  lassoRect: Rect,
  candidates: Set<Element>,
): void {
  let cur: Element | null = el;

  while (cur && !isExcludedElement(cur)) {
    if (!isHugeWrapper(cur, lassoRect) && getVisibleRect(cur)) {
      candidates.add(cur);
    }

    const parent = cur.parentElement;
    if (parent && isHugeWrapper(parent, lassoRect)) break;

    cur = parent;
  }
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
  const lassoRect = polygonBounds(polygon);
  const samplePoints = samplePointsInPolygon(polygon);
  const seen = new Set<Element>();
  const elements: Element[] = [];

  for (const p of samplePoints) {
    const stack = document.elementsFromPoint(p.x - window.scrollX, p.y - window.scrollY);
    let picked: Element | null = null;

    for (const el of stack) {
      if (isExcludedElement(el)) continue;

      const rect = getVisibleRect(el);
      if (!rect || rect.width < 8 || rect.height < 8) continue;

      if (isHugeWrapper(el, lassoRect)) continue;

      if (intersectionRatio(rect, lassoRect) < 0.2) continue;

      if (isUsefulContainer(el)) {
        picked = el;
        break;
      }

      if (!picked && !BROAD_TAGS.has(el.tagName)) {
        picked = el;
      }
    }

    if (picked && !seen.has(picked)) {
      seen.add(picked);
      elements.push(picked);
    }
  }

  return elements;
}

export function findBestGroupContainer(elements: Element[], lassoRect: Rect): Element | null {
  if (!elements.length) return null;

  const mapped = elements.map((el) => findNearestUsefulContainer(el, lassoRect) ?? el);
  const candidates = new Set<Element>();

  for (const el of mapped) {
    collectAncestorCandidates(el, lassoRect, candidates);
  }

  let best: Element | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const contained = mapped.filter((el) => candidate.contains(el)).length;
    const coverage = contained / mapped.length;
    if (coverage < 0.5) continue;

    const score = scoreContainer(candidate, lassoRect, mapped);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best) {
    for (const el of mapped) {
      const score = scoreContainer(el, lassoRect, mapped);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
  }

  return best ?? mapped[0] ?? null;
}

export function getGroupSelectionRect(
  container: Element,
  elements: Element[],
  lassoRect: Rect,
): Rect | null {
  const containerRect = getVisibleRect(container);
  if (!containerRect) return null;

  const mapped = elements.map((el) => findNearestUsefulContainer(el, lassoRect) ?? el);
  const unionSources = mapped.filter(
    (el) => isUsefulContainer(el) || !BROAD_TAGS.has(el.tagName),
  );
  const uniqueMapped = [...new Set(unionSources.length > 0 ? unionSources : mapped)];

  const useUnion =
    uniqueMapped.length > 1 ||
    isHugeWrapper(container, lassoRect) ||
    area(containerRect) > area(lassoRect) * 2.5;

  if (!useUnion) return containerRect;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const el of uniqueMapped) {
    const rect = getVisibleRect(el);
    if (!rect) continue;
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
    count++;
  }

  if (count === 0) return containerRect;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function logGroupSelection(
  elements: Element[],
  container: Element,
  lassoRect: Rect,
  selectionRect: Rect,
): void {
  const id = container.id ? `#${container.id}` : "";
  const className = typeof container.className === "string" ? container.className.split(/\s+/)[0] : "";
  const classHint = className ? `.${className}` : "";
  const lassoArea = area(lassoRect);
  const chosenArea = area(selectionRect);
  const areaRatio = lassoArea > 0 ? chosenArea / lassoArea : 0;

  console.info("[Genie] group selected", {
    elementCount: elements.length,
    chosen: `${container.tagName.toLowerCase()}${id}${classHint}`,
    lassoRect,
    chosenRect: selectionRect,
    areaRatio: Math.round(areaRatio * 100) / 100,
  });
}

export function buildTargetSignature(el: Element): TargetSignature {
  const bbox = getVisibleRect(el)!;
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const tagHint = el.tagName.toLowerCase();
  const roleHint = el.getAttribute("role") ?? undefined;
  let selectorHint: string | undefined;
  if (el.id) selectorHint = `#${el.id}`;
  else {
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) {
      selectorHint = `[aria-label="${ariaLabel.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
    } else if (el.className && typeof el.className === "string") {
      const cls = el.className.trim().split(/\s+/).slice(0, 2).join(".");
      if (cls) selectorHint = `${tagHint}.${cls}`;
    }
  }

  return { textSignature: text || undefined, selectorHint, roleHint, tagHint, bbox };
}

function isRootWrapper(el: Element): boolean {
  return ROOT_TAGS.has(el.tagName) || el === document.documentElement;
}

function isValidTarget(el: Element): boolean {
  if (isGenieElement(el) || isRootWrapper(el)) return false;
  const rect = getVisibleRect(el);
  if (!rect) return false;
  const maxArea = window.innerWidth * window.innerHeight * 0.85;
  return rect.width * rect.height <= maxArea;
}

export function resolveTargetElement(target: TargetSignature): Element | null {
  if (target.selectorHint) {
    try {
      const el = document.querySelector(target.selectorHint);
      if (el && isValidTarget(el)) return el;
    } catch {
      /* invalid selector */
    }
  }

  if (target.roleHint) {
    const roleMatches = document.querySelectorAll(`[role="${CSS.escape(target.roleHint)}"]`);
    for (const el of roleMatches) {
      if (isValidTarget(el)) return el;
    }
  }

  const candidates = Array.from(
    document.querySelectorAll("article, aside, section, main, nav, form, div[id], [aria-label]"),
  );
  let best: Element | null = null;
  let bestScore = 0;

  for (const el of candidates) {
    if (!isValidTarget(el)) continue;
    const rect = getVisibleRect(el)!;

    let score = 0;
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
    const sig = target.textSignature?.replace(/\s+/g, " ");
    if (sig && text.includes(sig.slice(0, 40))) score += 50;

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
