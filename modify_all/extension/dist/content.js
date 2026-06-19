"use strict";
(() => {
  // src/content/api.ts
  var API_BASE = "http://localhost:4000";
  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  function getPageContext() {
    const { hostname, pathname } = window.location;
    let path = pathname || "/";
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return { domain: hostname, path };
  }

  // src/content/patchEngine.ts
  var applied = /* @__PURE__ */ new Map();
  function resetToOriginal(state) {
    const { element, originalStyle } = state;
    element.style.cssText = "";
    for (const [prop, value] of Object.entries(originalStyle)) {
      if (value) {
        element.style[prop] = value;
      }
    }
    delete element.dataset.genieBaseWidth;
    delete element.dataset.genieBaseHeight;
  }
  function normalizeOperationsForGroup(groupId, operations) {
    return operations.map((op) => ({ ...op, targetId: groupId }));
  }
  function storeOriginal(el, key) {
    const existing = applied.get(key);
    if (existing) return existing;
    const rect = el.getBoundingClientRect();
    const originalStyle = {};
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
      "transformOrigin"
    ]) {
      originalStyle[prop] = el.style.getPropertyValue(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)) || "";
    }
    const state = {
      element: el,
      originalStyle,
      hidden: false,
      baseWidth: rect.width,
      baseHeight: rect.height
    };
    applied.set(key, state);
    return state;
  }
  function getLayoutBase(element) {
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
  function ensureLayoutBase(element) {
    const base = getLayoutBase(element);
    element.dataset.genieBaseWidth = String(Math.round(base.width));
    element.dataset.genieBaseHeight = String(Math.round(base.height));
    return base;
  }
  function parseTransformParts(transform) {
    let translateX = 0;
    let translateY = 0;
    let scaleX = 1;
    let scaleY = 1;
    const translateMatch = transform.match(
      /translate(?:3d)?\(([-\d.]+)px(?:,\s*([-\d.]+)px)?(?:,\s*[-\d.]+px)?\)/
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
  function parseElementLayout(element) {
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
      visualHeight: base.height * parts.scaleY
    };
  }
  function applyVisualLayout(element, layout) {
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
    const parts = [];
    if (translateX !== 0 || translateY !== 0) {
      parts.push(`translate(${translateX}px, ${translateY}px)`);
    }
    if (scaleX !== 1 || scaleY !== 1) {
      parts.push(`scale(${scaleX}, ${scaleY})`);
    }
    element.style.transform = parts.length > 0 ? parts.join(" ") : "none";
  }
  function applyOperations(groupId, element, operations) {
    const state = storeOriginal(element, groupId);
    resetToOriginal(state);
    state.hidden = false;
    ensureLayoutBase(element);
    const ops = normalizeOperationsForGroup(groupId, operations);
    let translateX = 0;
    let translateY = 0;
    let visualWidth;
    let visualHeight;
    for (const op of ops) {
      switch (op.type) {
        case "style":
          for (const [key, value] of Object.entries(op.css)) {
            if (value !== void 0) {
              element.style[key] = value;
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
      visualHeight
    });
  }
  function getElementTransform(element) {
    const layout = parseElementLayout(element);
    return { x: layout.translateX, y: layout.translateY };
  }
  function buildOperationsFromManualEdit(groupId, element, baseOps, hint) {
    const ops = baseOps.filter((o) => o.type !== "move" && o.type !== "resize");
    const layout = parseElementLayout(element);
    const transform = hint?.translate ?? { x: layout.translateX, y: layout.translateY };
    const hasMove = Math.abs(transform.x) > 0.5 || Math.abs(transform.y) > 0.5;
    if (hasMove) {
      ops.push({
        type: "move",
        targetId: groupId,
        translateX: Math.round(transform.x),
        translateY: Math.round(transform.y)
      });
    }
    const visualWidth = hint?.rect?.width ?? layout.visualWidth;
    const visualHeight = hint?.rect?.height ?? layout.visualHeight;
    const hasResize = Math.abs(visualWidth - layout.baseWidth) > 1 || Math.abs(visualHeight - layout.baseHeight) > 1;
    if (hasResize) {
      ops.push({
        type: "resize",
        targetId: groupId,
        width: Math.round(visualWidth),
        height: Math.round(visualHeight)
      });
    }
    return ops;
  }

  // src/content/grouping.ts
  var GENIE_ATTR = "data-genie-ui";
  var IGNORE_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "IFRAME"]);
  var ROOT_TAGS = /* @__PURE__ */ new Set(["HTML", "BODY"]);
  var SEMANTIC_TAGS = /* @__PURE__ */ new Set(["ARTICLE", "ASIDE", "SECTION"]);
  var SEMANTIC_ROLES = /* @__PURE__ */ new Set(["article", "complementary", "region"]);
  var BROAD_TAGS = /* @__PURE__ */ new Set(["MAIN", "NAV"]);
  var USEFUL_HINT_RE = /\b(card|panel|sidebar|news|feed|post|profile|widget|module|composer|puzzle|saved)\b/i;
  var HUGE_WRAPPER_HINT_RE = /\b(page-layout|app-root|site-root|left-rail|right-rail|page-wrapper|layout-wrapper)\b/i;
  function isGenieElement(el) {
    if (!el) return true;
    if (el.closest(`[${GENIE_ATTR}]`)) return true;
    return false;
  }
  function getVisibleRect(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return null;
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
  }
  function area(rect) {
    return rect.width * rect.height;
  }
  function intersectionRatio(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const minArea = Math.min(area(a), area(b));
    return minArea > 0 ? inter / minArea : 0;
  }
  function isExcludedElement(el) {
    if (IGNORE_TAGS.has(el.tagName) || ROOT_TAGS.has(el.tagName)) return true;
    if (el === document.documentElement || el === document.body) return true;
    return isGenieElement(el);
  }
  function isUsefulContainer(el) {
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
  function isHugeWrapper(el, lassoRect) {
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
  function scoreContainer(el, lassoRect, selectedElements) {
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
      score += contained / selectedElements.length * 50;
    }
    if (el.tagName === "DIV" && !isUsefulContainer(el)) score -= 15;
    if (BROAD_TAGS.has(el.tagName)) score -= 20;
    return score;
  }
  function findNearestUsefulContainer(el, lassoRect) {
    let cur = el;
    let fallback = null;
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
  function pickContainerAtPoint(clientX, clientY) {
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
  function collectAncestorCandidates(el, lassoRect, candidates) {
    let cur = el;
    while (cur && !isExcludedElement(cur)) {
      if (!isHugeWrapper(cur, lassoRect) && getVisibleRect(cur)) {
        candidates.add(cur);
      }
      const parent = cur.parentElement;
      if (parent && isHugeWrapper(parent, lassoRect)) break;
      cur = parent;
    }
  }
  function summarizeElement(el, index) {
    const bbox = getVisibleRect(el);
    if (!bbox) return null;
    const style = window.getComputedStyle(el);
    const text = (el.textContent ?? "").trim().slice(0, 120);
    return {
      localId: `el_${index}`,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role") ?? void 0,
      text: text || void 0,
      classHint: typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(" ") : void 0,
      ariaLabel: el.getAttribute("aria-label") ?? void 0,
      bbox,
      computedStyle: {
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontSize: style.fontSize,
        display: style.display
      }
    };
  }
  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersect = yi > point.y !== yj > point.y && point.x < (xj - xi) * (point.y - yi) / (yj - yi + 1e-4) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  function polygonBounds(points) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(...xs) - minX,
      height: Math.max(...ys) - minY
    };
  }
  function samplePointsInPolygon(polygon, step = 24) {
    const bounds = polygonBounds(polygon);
    const points = [];
    for (let x = bounds.x; x <= bounds.x + bounds.width; x += step) {
      for (let y = bounds.y; y <= bounds.y + bounds.height; y += step) {
        const p = { x, y };
        if (pointInPolygon(p, polygon)) points.push(p);
      }
    }
    return points;
  }
  function collectElementsFromLasso(polygon) {
    const lassoRect = polygonBounds(polygon);
    const samplePoints = samplePointsInPolygon(polygon);
    const seen = /* @__PURE__ */ new Set();
    const elements = [];
    for (const p of samplePoints) {
      const stack = document.elementsFromPoint(p.x - window.scrollX, p.y - window.scrollY);
      let picked = null;
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
  function findBestGroupContainer(elements, lassoRect) {
    if (!elements.length) return null;
    const mapped = elements.map((el) => findNearestUsefulContainer(el, lassoRect) ?? el);
    const candidates = /* @__PURE__ */ new Set();
    for (const el of mapped) {
      collectAncestorCandidates(el, lassoRect, candidates);
    }
    let best = null;
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
  function getGroupSelectionRect(container, elements, lassoRect) {
    const containerRect = getVisibleRect(container);
    if (!containerRect) return null;
    const mapped = elements.map((el) => findNearestUsefulContainer(el, lassoRect) ?? el);
    const unionSources = mapped.filter(
      (el) => isUsefulContainer(el) || !BROAD_TAGS.has(el.tagName)
    );
    const uniqueMapped = [...new Set(unionSources.length > 0 ? unionSources : mapped)];
    const useUnion = uniqueMapped.length > 1 || isHugeWrapper(container, lassoRect) || area(containerRect) > area(lassoRect) * 2.5;
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
      height: maxY - minY
    };
  }
  function logGroupSelection(elements, container, lassoRect, selectionRect) {
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
      areaRatio: Math.round(areaRatio * 100) / 100
    });
  }
  function buildTargetSignature(el) {
    const bbox = getVisibleRect(el);
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const tagHint = el.tagName.toLowerCase();
    const roleHint = el.getAttribute("role") ?? void 0;
    let selectorHint;
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
    return { textSignature: text || void 0, selectorHint, roleHint, tagHint, bbox };
  }
  function isRootWrapper(el) {
    return ROOT_TAGS.has(el.tagName) || el === document.documentElement;
  }
  function isValidTarget(el) {
    if (isGenieElement(el) || isRootWrapper(el)) return false;
    const rect = getVisibleRect(el);
    if (!rect) return false;
    const maxArea = window.innerWidth * window.innerHeight * 0.85;
    return rect.width * rect.height <= maxArea;
  }
  function resolveTargetElement(target) {
    if (target.selectorHint) {
      try {
        const el = document.querySelector(target.selectorHint);
        if (el && isValidTarget(el)) return el;
      } catch {
      }
    }
    if (target.roleHint) {
      const roleMatches = document.querySelectorAll(`[role="${CSS.escape(target.roleHint)}"]`);
      for (const el of roleMatches) {
        if (isValidTarget(el)) return el;
      }
    }
    const candidates = Array.from(
      document.querySelectorAll("article, aside, section, main, nav, form, div[id], [aria-label]")
    );
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      if (!isValidTarget(el)) continue;
      const rect = getVisibleRect(el);
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
  function bboxOverlap(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = a.width * a.height + b.width * b.height - inter;
    return union > 0 ? inter / union : 0;
  }
  function createGroupId() {
    return `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // src/content/persistence.ts
  var reapplyObserver = null;
  var bootStarted = false;
  async function loadAndApplyCustomizations() {
    const { domain, path } = getPageContext();
    console.log("[genie] loading customizations", { domain, path });
    try {
      const data = await apiGet(
        `/api/customizations?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(path)}`
      );
      const list = Array.isArray(data.customizations) ? data.customizations : [];
      console.log("[genie] customizations returned:", list.length);
      let applied2 = 0;
      for (const c of list) {
        if (c.enabled === false) continue;
        const hint = c.target.selectorHint ?? c.target.textSignature?.slice(0, 40) ?? "(no hint)";
        console.log("[genie] applying", { groupId: c.groupId, target: hint });
        if (applyCustomization(c)) applied2 += 1;
      }
      console.log("[genie] operations applied count:", applied2);
      return applied2;
    } catch (err) {
      console.warn("[genie] could not load customizations", err);
      return 0;
    }
  }
  function applyCustomization(c) {
    const el = resolveTargetElement(c.target);
    if (!el || !(el instanceof HTMLElement)) {
      console.log("[genie] target not resolved", { groupId: c.groupId });
      return false;
    }
    el.setAttribute("data-genie-group", c.groupId);
    const ops = normalizeOperationsForGroup(c.groupId, c.operations);
    applyOperations(c.groupId, el, ops);
    console.log("[genie] target resolved", {
      groupId: c.groupId,
      ops: ops.length,
      operationTypes: ops.map((op) => op.type),
      tag: el.tagName.toLowerCase(),
      id: el.id || void 0
    });
    return true;
  }
  function ensureReapplyObserver() {
    if (reapplyObserver) return reapplyObserver;
    reapplyObserver = setupReapplyObserver();
    return reapplyObserver;
  }
  function bootPersistedCustomizations() {
    if (bootStarted) return;
    bootStarted = true;
    const run = () => {
      void loadAndApplyCustomizations();
      ensureReapplyObserver();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }
  async function saveCustomization(groupId, target, operations) {
    const { domain, path } = getPageContext();
    await apiPost("/api/customizations", {
      domain,
      pathPattern: path,
      groupId,
      target,
      operations,
      enabled: true
    });
  }
  function setupReapplyObserver() {
    let timer = null;
    const observer = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        loadAndApplyCustomizations();
      }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  // ../shared/contracts.ts
  var DEMO_USER_ID = "demo-user";

  // src/content/dragResize.ts
  function createDragState() {
    return {
      dragging: false,
      resizing: false,
      corner: "",
      startX: 0,
      startY: 0,
      startRect: { x: 0, y: 0, width: 0, height: 0 },
      startTranslate: { x: 0, y: 0 },
      lastTranslate: { x: 0, y: 0 },
      lastRect: null
    };
  }
  function startDrag(state, e, rect, translate) {
    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startRect = { ...rect };
    state.startTranslate = { ...translate };
    state.lastTranslate = { ...translate };
    state.lastRect = { ...rect };
  }
  function startResize(state, corner, e, rect) {
    state.resizing = true;
    state.corner = corner;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startRect = { ...rect };
    state.lastRect = { ...rect };
  }
  function updateDrag(state, e) {
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const translateX = state.startTranslate.x + dx;
    const translateY = state.startTranslate.y + dy;
    const rect = {
      x: state.startRect.x + dx,
      y: state.startRect.y + dy,
      width: state.startRect.width,
      height: state.startRect.height
    };
    state.lastTranslate = { x: translateX, y: translateY };
    state.lastRect = rect;
    return { translateX, translateY, rect };
  }
  function updateResize(state, e) {
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
  function endDragResize(state) {
    state.dragging = false;
    state.resizing = false;
    state.corner = "";
  }

  // src/content/overlay.ts
  var Overlay = class {
    constructor(callbacks) {
      this.selectionBoxes = /* @__PURE__ */ new Map();
      this.selectionHandles = /* @__PURE__ */ new Map();
      this.interactionCallbacks = null;
      this.onWindowResize = () => this.resizeSvg();
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
    mount() {
      document.documentElement.appendChild(this.root);
      this.resizeSvg();
      window.addEventListener("resize", this.onWindowResize);
    }
    unmount() {
      window.removeEventListener("resize", this.onWindowResize);
      this.root.remove();
    }
    resizeSvg() {
      const width = document.documentElement.scrollWidth;
      const height = document.documentElement.scrollHeight;
      this.svg.setAttribute("width", String(width));
      this.svg.setAttribute("height", String(height));
      this.svg.style.width = `${width}px`;
      this.svg.style.height = `${height}px`;
    }
    showHover(rect) {
      this.hoverBox.style.display = "block";
      this.hoverBox.style.transform = `translate(${rect.x - window.scrollX}px, ${rect.y - window.scrollY}px)`;
      this.hoverBox.style.width = `${rect.width}px`;
      this.hoverBox.style.height = `${rect.height}px`;
    }
    hideHover() {
      this.hoverBox.style.display = "none";
    }
    drawLasso(points) {
      if (points.length < 2) {
        this.lassoPath.setAttribute("d", "");
        return;
      }
      const path = points.map((point, index) => {
        const x = point.x - window.scrollX;
        const y = point.y - window.scrollY;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ") + " Z";
      this.lassoPath.setAttribute("d", path);
    }
    clearLasso() {
      this.lassoPath.setAttribute("d", "");
    }
    syncSelections(selections, interactionCallbacks) {
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
            if (event.target.closest(".genie-handle")) return;
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
            this.labelTag.style.transform = `translate(${sel.rect.x - window.scrollX}px, ${sel.rect.y - window.scrollY - 28}px)`;
          } else {
            this.labelTag.style.display = "none";
          }
          this.sizeLabel.textContent = `${Math.round(sel.rect.width)} \xD7 ${Math.round(sel.rect.height)}`;
          this.sizeLabel.style.display = "block";
          this.sizeLabel.style.transform = `translate(${sel.rect.x - window.scrollX + sel.rect.width / 2 - 40}px, ${sel.rect.y - window.scrollY + sel.rect.height + 8}px)`;
        }
      }
      if (!primary) {
        this.labelTag.style.display = "none";
        this.sizeLabel.style.display = "none";
      }
    }
    updateSelectionRect(groupId, rect) {
      const box = this.selectionBoxes.get(groupId);
      if (!box) return;
      this.updateBoxRect(box, rect);
      if (box.classList.contains("is-primary")) {
        this.sizeLabel.textContent = `${Math.round(rect.width)} \xD7 ${Math.round(rect.height)}`;
        this.sizeLabel.style.transform = `translate(${rect.x - window.scrollX + rect.width / 2 - 40}px, ${rect.y - window.scrollY + rect.height + 8}px)`;
      }
    }
    hideAllSelections() {
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
    hideSelection() {
      this.hideAllSelections();
    }
    updateBoxRect(box, rect) {
      box.style.display = "block";
      box.style.transform = `translate(${rect.x - window.scrollX}px, ${rect.y - window.scrollY}px)`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
    }
    renderHandles(groupId, box) {
      this.clearHandles(groupId);
      const corners = ["nw", "ne", "sw", "se"];
      const handles = [];
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
    clearHandles(groupId) {
      const handles = this.selectionHandles.get(groupId);
      if (!handles) return;
      for (const handle of handles) {
        handle.remove();
      }
      this.selectionHandles.delete(groupId);
    }
  };
  var LassoController = class {
    constructor() {
      this.active = false;
      this.points = [];
    }
    start(x, y) {
      this.active = true;
      this.points = [{ x: x + window.scrollX, y: y + window.scrollY }];
    }
    move(x, y) {
      if (!this.active) return this.points;
      this.points.push({ x: x + window.scrollX, y: y + window.scrollY });
      return this.points;
    }
    end() {
      this.active = false;
      return this.points;
    }
    isActive() {
      return this.active;
    }
    reset() {
      this.active = false;
      this.points = [];
    }
  };

  // src/content/ui/geniePanelTypes.ts
  var GENIE_PANEL_PLACEHOLDER = "Tell Genie what to change in this group";
  var DEFAULT_QUICK_ACTIONS = [
    { id: "dark-mode", label: "Dark mode", prompt: "Apply dark mode to this group" },
    { id: "compact", label: "Compact", prompt: "Make this group more compact" },
    { id: "hide", label: "Hide", prompt: "Hide this group" },
    { id: "move-lower", label: "Move lower", prompt: "Move this group lower on the page" },
    { id: "match-style", label: "Match my style", prompt: "Match my saved style preferences" }
  ];
  var DEFAULT_GENIE_PANEL_PROPS = {
    visible: false,
    sectionLabel: "Section",
    placeholder: GENIE_PANEL_PLACEHOLDER,
    promptValue: "",
    quickActions: DEFAULT_QUICK_ACTIONS,
    selectedQuickActionId: null,
    status: "idle",
    statusMessage: "",
    position: { left: 24, top: 24 }
  };
  var STATUS_COPY = {
    idle: "",
    loading: "Thinking with OpenInfer...",
    "preview-ready": "Preview ready",
    saved: "Saved to MongoDB",
    error: "Could not apply patch"
  };

  // src/content/ui/geniePanelView.ts
  var GeniePanelView = class {
    constructor(callbacks, initialProps) {
      this.callbacks = callbacks;
      this.props = {
        visible: false,
        sectionLabel: "Section",
        placeholder: "Tell Genie what to change in this group",
        promptValue: "",
        quickActions: [],
        selectedQuickActionId: null,
        status: "idle",
        statusMessage: "",
        position: { left: 24, top: 24 },
        ...initialProps
      };
      this.root = document.createElement("div");
      this.root.className = "genie-panel";
      this.root.setAttribute(GENIE_ATTR, "panel");
      this.root.setAttribute("role", "dialog");
      this.root.setAttribute("aria-label", "Genie section editor");
      this.root.innerHTML = `
      <div class="genie-panel-accent"></div>
      <div class="genie-panel-header">
        <div class="genie-panel-heading">
          <div class="genie-panel-title-row">
            <span class="genie-panel-mark" aria-hidden="true">\u2726</span>
            <div class="genie-panel-title">Genie</div>
          </div>
          <div class="genie-panel-subtitle">Edit this section</div>
        </div>
        <button type="button" class="genie-panel-close" data-action="close" aria-label="Close Genie panel">\xD7</button>
      </div>
      <div class="genie-panel-scope">This group only</div>
      <div class="genie-quick-actions" role="group" aria-label="Quick actions"></div>
      <label class="genie-prompt-label">
        <span class="genie-sr-only">Section edit prompt</span>
        <textarea class="genie-prompt" rows="3"></textarea>
      </label>
      <div class="genie-panel-status" aria-live="polite">
        <span class="genie-status-dot" aria-hidden="true"></span>
        <span class="genie-status-text"></span>
      </div>
      <div class="genie-panel-actions">
        <button type="button" class="genie-btn genie-btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="genie-btn genie-btn-primary" data-action="preview">Preview</button>
        <button type="button" class="genie-btn genie-btn-success" data-action="save">Save</button>
      </div>
    `;
      this.subtitleEl = this.root.querySelector(".genie-panel-subtitle");
      this.chipsEl = this.root.querySelector(".genie-quick-actions");
      this.promptEl = this.root.querySelector(".genie-prompt");
      this.statusEl = this.root.querySelector(".genie-panel-status");
      this.statusDotEl = this.root.querySelector(".genie-status-dot");
      this.promptEl.addEventListener("input", () => {
        this.callbacks.onPromptChange(this.promptEl.value);
      });
      this.root.querySelector('[data-action="preview"]')?.addEventListener("click", () => this.callbacks.onPreview());
      this.root.querySelector('[data-action="save"]')?.addEventListener("click", () => this.callbacks.onSave());
      this.root.querySelector('[data-action="cancel"]')?.addEventListener("click", () => this.callbacks.onCancel());
      this.root.querySelector('[data-action="close"]')?.addEventListener("click", () => this.callbacks.onCancel());
      this.root.addEventListener("click", (e) => e.stopPropagation());
      this.render(this.props);
    }
    updateProps(next) {
      this.props = { ...this.props, ...next };
      this.render(this.props);
    }
    getPromptValue() {
      return this.promptEl.value.trim();
    }
    render(props) {
      this.root.style.display = props.visible ? "flex" : "none";
      if (!props.visible) return;
      this.root.style.transform = `translate(${props.position.left}px, ${props.position.top}px)`;
      this.subtitleEl.textContent = props.sectionLabel ? `Editing: ${props.sectionLabel}` : "Edit this section";
      this.promptEl.placeholder = props.placeholder;
      if (this.promptEl.value !== props.promptValue) {
        this.promptEl.value = props.promptValue;
      }
      this.renderChips(props.quickActions, props.selectedQuickActionId ?? null);
      this.renderStatus(props);
    }
    renderChips(actions, selectedId) {
      this.chipsEl.replaceChildren();
      for (const action of actions) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "genie-chip";
        chip.textContent = action.label;
        chip.dataset.actionId = action.id;
        chip.setAttribute("aria-pressed", String(action.id === selectedId));
        if (action.id === selectedId) chip.classList.add("is-selected");
        chip.addEventListener("click", () => this.callbacks.onQuickActionSelect(action));
        this.chipsEl.appendChild(chip);
      }
    }
    renderStatus(props) {
      const message = props.statusMessage || STATUS_COPY[props.status];
      const textEl = this.statusEl.querySelector(".genie-status-text");
      textEl.textContent = message;
      this.statusEl.className = "genie-panel-status";
      this.statusEl.classList.add(`genie-status-${props.status}`);
      this.statusDotEl.className = "genie-status-dot";
      if (props.status === "loading") {
        this.statusDotEl.classList.add("is-loading");
      }
    }
  };

  // src/content/ui/geniePanel.ts
  var PANEL_WIDTH = 336;
  var GeniePanel = class {
    constructor(callbacks, initialProps) {
      this.callbacks = callbacks;
      this.props = {
        ...DEFAULT_GENIE_PANEL_PROPS,
        quickActions: DEFAULT_QUICK_ACTIONS,
        placeholder: GENIE_PANEL_PLACEHOLDER,
        ...initialProps
      };
      this.view = new GeniePanelView(
        {
          onPromptChange: (value) => {
            this.props.promptValue = value;
            if (this.props.selectedQuickActionId) {
              this.props.selectedQuickActionId = null;
              this.sync();
            }
          },
          onQuickActionSelect: (action) => this.handleQuickAction(action),
          onPreview: () => this.callbacks.onPreview(this.view.getPromptValue()),
          onSave: () => this.callbacks.onSave(),
          onCancel: () => this.callbacks.onCancel()
        },
        this.props
      );
    }
    mount() {
      document.documentElement.appendChild(this.view.root);
    }
    unmount() {
      this.view.root.remove();
    }
    positionBeside(rect, label) {
      this.props.visible = true;
      this.props.sectionLabel = label ?? "Section";
      this.props.status = "idle";
      this.props.statusMessage = "";
      this.props.position = computePanelPosition(rect);
      this.sync();
    }
    hide() {
      this.props = {
        ...this.props,
        visible: false,
        promptValue: "",
        selectedQuickActionId: null,
        status: "idle",
        statusMessage: ""
      };
      this.sync();
    }
    setLoading() {
      this.props.status = "loading";
      this.props.statusMessage = STATUS_COPY.loading;
      this.sync();
    }
    showResult(result) {
      this.props.status = "preview-ready";
      this.props.statusMessage = `Preview ready \u2014 ${result.operations.length} operation(s)`;
      this.props.sectionLabel = result.sectionLabel;
      this.sync();
    }
    showError(msg) {
      this.props.status = "error";
      this.props.statusMessage = msg || STATUS_COPY.error;
      this.sync();
    }
    showSaved() {
      this.props.status = "saved";
      this.props.statusMessage = STATUS_COPY.saved;
      this.sync();
    }
    getInstruction() {
      return this.view.getPromptValue();
    }
    /** For UI preview / tests — render panel from mock props without selection wiring. */
    applyMockProps(mock) {
      this.props = { ...this.props, ...mock };
      this.sync();
    }
    handleQuickAction(action) {
      this.props.selectedQuickActionId = action.id;
      this.props.promptValue = action.prompt;
      this.props.status = "idle";
      this.props.statusMessage = "";
      this.sync();
      this.callbacks.onQuickAction(action.prompt);
    }
    sync() {
      this.view.updateProps(this.props);
    }
  };
  function computePanelPosition(rect) {
    let left = rect.x - window.scrollX + rect.width + 16;
    let top = rect.y - window.scrollY;
    if (left + PANEL_WIDTH > window.innerWidth) {
      left = rect.x - window.scrollX - PANEL_WIDTH - 16;
    }
    if (left < 8) left = 8;
    if (top + 420 > window.innerHeight) {
      top = Math.max(8, window.innerHeight - 440);
    }
    return { left, top };
  }

  // src/content/editMode.ts
  var CLICK_DRAG_THRESHOLD = 8;
  var EditModeController = class {
    constructor() {
      this.state = "off";
      this.overlay = null;
      this.lasso = new LassoController();
      this.panel = null;
      this.selections = [];
      this.primaryIndex = 0;
      this.dragState = createDragState();
      this.pointerDownClient = null;
      this.dragSnapshots = /* @__PURE__ */ new Map();
      this.resizeSnapshots = /* @__PURE__ */ new Map();
      this.activeDragGroupId = null;
      this.onMouseMove = (event) => {
        if (this.state === "off" || this.lasso.isActive() || this.dragState.dragging || this.dragState.resizing) {
          return;
        }
        const stack = document.elementsFromPoint(event.clientX, event.clientY);
        const element = stack.find(
          (node) => !isGenieElement(node) && node !== document.body && node !== document.documentElement
        );
        if (!element) {
          this.overlay?.hideHover();
          return;
        }
        const rect = getVisibleRect(element);
        if (rect) {
          this.overlay?.showHover(rect);
          this.state = this.selections.length > 0 ? "group-selected" : "hovering";
        }
      };
      this.onPointerDown = (event) => {
        if (this.state === "off" || !this.overlay) return;
        const target = event.target;
        if (target.closest(".genie-panel")) return;
        if (target.closest(".genie-selection-box")) return;
        if (this.state === "agent-open") return;
        if (!target.closest(".genie-overlay-root")) return;
        this.pointerDownClient = { x: event.clientX, y: event.clientY };
        this.overlay.root.classList.add("is-lasso-mode");
        this.lasso.start(event.clientX, event.clientY);
        this.state = "selecting";
        this.closePanel();
      };
      this.onSelectionDragStart = (groupId, event) => {
        if (!this.overlay) return;
        this.setPrimaryByGroupId(groupId);
        const entry = this.findSelection(groupId);
        if (!entry) return;
        this.activeDragGroupId = groupId;
        this.captureDragSnapshots();
        const rect = entry.group.shape.rect;
        const translate = getElementTransform(entry.element);
        startDrag(this.dragState, event, rect, translate);
        this.state = "dragging";
        event.currentTarget.setPointerCapture?.(event.pointerId);
      };
      this.onResizeHandle = (groupId, corner, event) => {
        const entry = this.findSelection(groupId);
        if (!entry) return;
        this.setPrimaryByGroupId(groupId);
        this.activeDragGroupId = groupId;
        this.captureResizeSnapshots();
        startResize(this.dragState, corner, event, entry.group.shape.rect);
        this.state = "resizing";
        event.target.setPointerCapture(event.pointerId);
      };
      this.onPointerMove = (event) => {
        if (!this.overlay) return;
        if (this.dragState.dragging && this.activeDragGroupId) {
          const { translateX, translateY, rect } = updateDrag(this.dragState, event);
          const dx = translateX - this.dragState.startTranslate.x;
          const dy = translateY - this.dragState.startTranslate.y;
          for (const entry of this.selections) {
            const snap = this.dragSnapshots.get(entry.group.groupId);
            if (!snap) continue;
            const newTranslateX = snap.translate.x + dx;
            const newTranslateY = snap.translate.y + dy;
            const newRect = {
              x: snap.rect.x + dx,
              y: snap.rect.y + dy,
              width: snap.rect.width,
              height: snap.rect.height
            };
            applyVisualLayout(entry.element, {
              translateX: newTranslateX,
              translateY: newTranslateY,
              visualWidth: snap.layout.visualWidth,
              visualHeight: snap.layout.visualHeight
            });
            entry.group.shape.rect = newRect;
            this.overlay.updateSelectionRect(entry.group.groupId, newRect);
          }
          return;
        }
        if (this.dragState.resizing && this.activeDragGroupId) {
          const primaryRect = updateResize(this.dragState, event);
          const scaleX = primaryRect.width / this.dragState.startRect.width;
          const scaleY = primaryRect.height / this.dragState.startRect.height;
          for (const entry of this.selections) {
            const snap = this.resizeSnapshots.get(entry.group.groupId);
            if (!snap) continue;
            const visualWidth = Math.max(40, snap.layout.visualWidth * scaleX);
            const visualHeight = Math.max(40, snap.layout.visualHeight * scaleY);
            applyVisualLayout(entry.element, {
              translateX: snap.translate.x,
              translateY: snap.translate.y,
              visualWidth,
              visualHeight
            });
            let newX = snap.rect.x;
            let newY = snap.rect.y;
            if (entry.group.groupId === this.activeDragGroupId) {
              newX = primaryRect.x;
              newY = primaryRect.y;
            } else {
              if (this.dragState.corner.includes("w")) {
                newX = snap.rect.x + (snap.layout.visualWidth - visualWidth);
              }
              if (this.dragState.corner.includes("n")) {
                newY = snap.rect.y + (snap.layout.visualHeight - visualHeight);
              }
            }
            const newRect = {
              x: newX,
              y: newY,
              width: visualWidth,
              height: visualHeight
            };
            entry.group.shape.rect = newRect;
            this.overlay.updateSelectionRect(entry.group.groupId, newRect);
          }
          return;
        }
        if (this.lasso.isActive()) {
          const points = this.lasso.move(event.clientX, event.clientY);
          this.overlay.drawLasso(points);
        }
      };
      this.onPointerUp = (event) => {
        if (this.dragState.dragging || this.dragState.resizing) {
          const hint = {
            translate: this.dragState.dragging ? { x: this.dragState.lastTranslate.x, y: this.dragState.lastTranslate.y } : void 0,
            rect: this.dragState.resizing && this.dragState.lastRect ? {
              width: this.dragState.lastRect.width,
              height: this.dragState.lastRect.height
            } : void 0
          };
          endDragResize(this.dragState);
          this.activeDragGroupId = null;
          this.dragSnapshots.clear();
          this.resizeSnapshots.clear();
          for (const entry of this.selections) {
            const layout = parseElementLayout(entry.element);
            const manualHint = {
              translate: { x: layout.translateX, y: layout.translateY },
              rect: { width: layout.visualWidth, height: layout.visualHeight }
            };
            entry.lastManualHint = manualHint;
            entry.operations = buildOperationsFromManualEdit(
              entry.group.groupId,
              entry.element,
              entry.operations,
              manualHint
            );
          }
          console.info("[genie] manual operations updated", {
            groups: this.selections.map((s) => ({
              groupId: s.group.groupId,
              operations: s.operations.map((op) => op.type)
            }))
          });
          this.state = "group-selected";
          return;
        }
        if (this.lasso.isActive()) {
          const points = this.lasso.end();
          this.overlay?.clearLasso();
          this.overlay?.root.classList.remove("is-lasso-mode");
          const down = this.pointerDownClient;
          this.pointerDownClient = null;
          const dragDist = down ? Math.hypot(event.clientX - down.x, event.clientY - down.y) : CLICK_DRAG_THRESHOLD + 1;
          if (dragDist < CLICK_DRAG_THRESHOLD && down) {
            const container = pickContainerAtPoint(down.x, down.y);
            if (container) {
              void this.selectContainer(container, event.shiftKey);
            }
            this.lasso.reset();
            return;
          }
          if (points.length > 4) {
            void this.onLassoComplete(points, event.shiftKey);
          }
          this.lasso.reset();
        }
      };
    }
    async enter() {
      if (this.state !== "off") return;
      document.body.classList.add("genie-editing");
      this.overlay = new Overlay({
        onLassoComplete: (points) => this.onLassoComplete(points),
        onBackgroundClick: () => this.closePanel(),
        onGroupDoubleClick: (groupId) => {
          this.setPrimaryByGroupId(groupId);
          this.openAgentPanel();
        }
      });
      this.overlay.mount();
      this.panel = new GeniePanel({
        onPreview: (instruction) => this.runAgent(instruction),
        onQuickAction: (instruction) => this.runAgent(instruction),
        onSave: () => this.saveCurrent(),
        onCancel: () => this.closePanel()
      });
      this.panel.mount();
      this.panel.hide();
      this.bindEvents();
      this.state = "hovering";
      await loadAndApplyCustomizations();
      ensureReapplyObserver();
    }
    exit() {
      document.body.classList.remove("genie-editing");
      this.unbindEvents();
      this.panel?.unmount();
      this.overlay?.unmount();
      this.selections = [];
      this.primaryIndex = 0;
      this.dragSnapshots.clear();
      this.resizeSnapshots.clear();
      this.activeDragGroupId = null;
      this.pointerDownClient = null;
      this.overlay = null;
      this.panel = null;
      this.state = "off";
    }
    getPrimary() {
      return this.selections[this.primaryIndex] ?? null;
    }
    findSelection(groupId) {
      return this.selections.find((s) => s.group.groupId === groupId);
    }
    bindEvents() {
      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("pointerdown", this.onPointerDown);
      document.addEventListener("pointermove", this.onPointerMove);
      window.addEventListener("pointerup", this.onPointerUp, true);
      window.addEventListener("pointercancel", this.onPointerUp, true);
    }
    unbindEvents() {
      document.removeEventListener("mousemove", this.onMouseMove);
      document.removeEventListener("pointerdown", this.onPointerDown);
      document.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("pointerup", this.onPointerUp, true);
      window.removeEventListener("pointercancel", this.onPointerUp, true);
    }
    captureDragSnapshots() {
      this.dragSnapshots.clear();
      for (const entry of this.selections) {
        this.dragSnapshots.set(entry.group.groupId, {
          translate: getElementTransform(entry.element),
          rect: { ...entry.group.shape.rect },
          layout: parseElementLayout(entry.element)
        });
      }
    }
    captureResizeSnapshots() {
      this.resizeSnapshots.clear();
      for (const entry of this.selections) {
        ensureLayoutBase(entry.element);
        this.resizeSnapshots.set(entry.group.groupId, {
          translate: getElementTransform(entry.element),
          rect: { ...entry.group.shape.rect },
          layout: parseElementLayout(entry.element)
        });
      }
    }
    async onLassoComplete(points, addToSelection = false) {
      const lassoRect = polygonBounds(points);
      const elements = collectElementsFromLasso(points);
      const container = findBestGroupContainer(elements, lassoRect);
      if (!container || !(container instanceof HTMLElement)) return;
      const rect = getGroupSelectionRect(container, elements, lassoRect);
      if (!rect) return;
      logGroupSelection(elements, container, lassoRect, rect);
      await this.createAndAddSelection(container, {
        addToSelection,
        shape: { type: "lasso", rect, points },
        domElements: elements
      });
    }
    async selectContainer(container, addToSelection) {
      const rect = getVisibleRect(container);
      if (!rect) return;
      await this.createAndAddSelection(container, {
        addToSelection,
        shape: { type: "rectangle", rect },
        domElements: [container]
      });
    }
    async createAndAddSelection(container, options) {
      if (!options.addToSelection) {
        this.clearSelections();
      }
      if (this.selections.some((s) => s.element === container)) {
        this.setPrimaryByElement(container);
        this.syncOverlaySelections();
        return;
      }
      const { domain, path } = getPageContext();
      const groupId = createGroupId();
      const domSummary = options.domElements.slice(0, 12).map((element, index) => summarizeElement(element, index)).filter(Boolean);
      const target = buildTargetSignature(container);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const group = {
        groupId,
        userId: DEMO_USER_ID,
        domain,
        path,
        shape: options.shape,
        target,
        domSummary,
        createdAt: now,
        updatedAt: now
      };
      try {
        const understood = await apiPost("/api/groups/understand", {
          domain,
          path,
          group
        });
        group.label = understood.label;
      } catch {
        group.label = target.textSignature?.slice(0, 30) ?? "Section";
      }
      this.addSelection(group, container);
    }
    addSelection(group, element) {
      ensureLayoutBase(element);
      element.setAttribute("data-genie-group", group.groupId);
      this.selections.push({
        group,
        element,
        operations: [],
        lastManualHint: null
      });
      this.primaryIndex = this.selections.length - 1;
      this.syncOverlaySelections();
      this.state = "group-selected";
    }
    clearSelections() {
      this.selections = [];
      this.primaryIndex = 0;
      this.overlay?.hideAllSelections();
    }
    setPrimaryByGroupId(groupId) {
      const index = this.selections.findIndex((s) => s.group.groupId === groupId);
      if (index >= 0) this.primaryIndex = index;
    }
    setPrimaryByElement(element) {
      const index = this.selections.findIndex((s) => s.element === element);
      if (index >= 0) this.primaryIndex = index;
    }
    syncOverlaySelections() {
      if (!this.overlay) return;
      this.overlay.syncSelections(
        this.selections.map((entry, index) => ({
          groupId: entry.group.groupId,
          rect: entry.group.shape.rect,
          label: index === this.primaryIndex ? entry.group.label : void 0,
          primary: index === this.primaryIndex
        })),
        {
          onResizeHandle: (groupId, corner, event) => this.onResizeHandle(groupId, corner, event),
          onSelectionDragStart: (groupId, event) => this.onSelectionDragStart(groupId, event)
        }
      );
    }
    openAgentPanel() {
      const primary = this.getPrimary();
      if (!primary || !this.overlay || !this.panel) return;
      this.panel.positionBeside(primary.group.shape.rect, primary.group.label);
      this.state = "agent-open";
    }
    closePanel() {
      this.panel?.hide();
      if (this.selections.length > 0) {
        this.state = "group-selected";
      } else {
        this.state = "hovering";
      }
    }
    async runAgent(instruction) {
      const primary = this.getPrimary();
      if (!primary || !this.panel) return;
      if (!instruction) {
        this.panel.showError("Enter an instruction or pick a quick action");
        return;
      }
      this.panel.setLoading();
      const { domain, path } = getPageContext();
      try {
        const result = await apiPost("/api/agent/section-edit", {
          domain,
          path,
          group: primary.group,
          instruction
        });
        primary.operations = normalizeOperationsForGroup(primary.group.groupId, result.operations);
        applyOperations(primary.group.groupId, primary.element, primary.operations);
        primary.group.label = result.sectionLabel;
        this.syncOverlaySelections();
        this.panel.showResult(result);
      } catch (error) {
        this.panel.showError(String(error));
      }
    }
    async saveCurrent() {
      if (!this.panel || this.selections.length === 0) return;
      let savedCount = 0;
      for (const entry of this.selections) {
        const hint = entry.lastManualHint ?? (() => {
          const layout = parseElementLayout(entry.element);
          return {
            translate: { x: layout.translateX, y: layout.translateY },
            rect: { width: layout.visualWidth, height: layout.visualHeight }
          };
        })();
        let operations = buildOperationsFromManualEdit(
          entry.group.groupId,
          entry.element,
          entry.operations,
          hint
        );
        operations = normalizeOperationsForGroup(entry.group.groupId, operations);
        entry.operations = operations;
        const rect = getVisibleRect(entry.element);
        if (rect) {
          entry.group.target = { ...entry.group.target, bbox: rect };
        }
        if (operations.length === 0) continue;
        console.info("[genie] saving customization", {
          groupId: entry.group.groupId,
          operationTypes: operations.map((op) => op.type),
          operationCount: operations.length
        });
        await saveCustomization(entry.group.groupId, entry.group.target, operations);
        savedCount += 1;
      }
      if (savedCount === 0) {
        this.panel.showError("No changes to save \u2014 drag or resize the group, or run Preview first");
        return;
      }
      this.panel.showSaved();
    }
  };
  var editMode = new EditModeController();
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GENIE_TOGGLE_EDIT_MODE") {
      if (editMode.state === "off") {
        editMode.enter().then(() => sendResponse({ active: true }));
      } else {
        editMode.exit();
        sendResponse({ active: false });
      }
      return true;
    }
    if (message.type === "GENIE_GET_STATE") {
      sendResponse({ active: editMode.state !== "off" });
      return true;
    }
    if (message.type === "GENIE_SET_EDIT_MODE") {
      const enabled = Boolean(message.enabled);
      if (enabled && editMode.state === "off") {
        editMode.enter().then(
          () => sendResponse({
            ok: true,
            state: editMode.state,
            enabled: editMode.state !== "off"
          })
        );
        return true;
      }
      if (!enabled && editMode.state !== "off") {
        editMode.exit();
      }
      sendResponse({
        ok: true,
        state: editMode.state,
        enabled: editMode.state !== "off"
      });
      return true;
    }
    if (message.type === "GENIE_GET_EDIT_MODE") {
      sendResponse({
        ok: true,
        state: editMode.state,
        enabled: editMode.state !== "off"
      });
      return true;
    }
    return false;
  });

  // src/content/index.ts
  console.log("[genie] content script loaded");
  bootPersistedCustomizations();
})();
//# sourceMappingURL=content.js.map
