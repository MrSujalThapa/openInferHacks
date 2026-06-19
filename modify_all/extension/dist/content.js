"use strict";
(() => {
  // ../shared/contracts.ts
  var DEMO_USER_ID = "demo-user";

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
    return { domain: hostname, path: pathname || "/" };
  }

  // src/content/dragResize.ts
  function createDragState() {
    return {
      dragging: false,
      resizing: false,
      corner: "",
      startX: 0,
      startY: 0,
      startRect: { x: 0, y: 0, width: 0, height: 0 },
      startTranslate: { x: 0, y: 0 }
    };
  }
  function startDrag(state, e, rect, translate) {
    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startRect = { ...rect };
    state.startTranslate = { ...translate };
  }
  function startResize(state, corner, e, rect) {
    state.resizing = true;
    state.corner = corner;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startRect = { ...rect };
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
    return { x, y, width, height };
  }
  function endDragResize(state) {
    state.dragging = false;
    state.resizing = false;
    state.corner = "";
  }

  // src/content/grouping.ts
  var GENIE_ATTR = "data-genie-ui";
  var IGNORE_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "IFRAME"]);
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
    const samplePoints = samplePointsInPolygon(polygon);
    const seen = /* @__PURE__ */ new Set();
    const elements = [];
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
  var CONTAINER_TAGS = /* @__PURE__ */ new Set(["ARTICLE", "ASIDE", "SECTION", "MAIN", "NAV", "DIV", "FORM"]);
  function findBestGroupContainer(elements) {
    if (!elements.length) return null;
    const counts = /* @__PURE__ */ new Map();
    for (const el of elements) {
      let cur = el;
      while (cur && cur !== document.body) {
        counts.set(cur, (counts.get(cur) ?? 0) + 1);
        cur = cur.parentElement;
      }
    }
    let best = null;
    let bestScore = -1;
    for (const [el, count] of counts) {
      if (!CONTAINER_TAGS.has(el.tagName)) continue;
      const rect = getVisibleRect(el);
      if (!rect) continue;
      const area = rect.width * rect.height;
      if (area < 4e3) continue;
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
  function buildTargetSignature(el) {
    const bbox = getVisibleRect(el);
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const tagHint = el.tagName.toLowerCase();
    const roleHint = el.getAttribute("role") ?? void 0;
    let selectorHint;
    if (el.id) selectorHint = `#${el.id}`;
    else if (el.className && typeof el.className === "string") {
      const cls = el.className.trim().split(/\s+/).slice(0, 2).join(".");
      if (cls) selectorHint = `${tagHint}.${cls}`;
    }
    return { textSignature: text || void 0, selectorHint, roleHint, tagHint, bbox };
  }
  function resolveTargetElement(target) {
    if (target.selectorHint) {
      try {
        const el = document.querySelector(target.selectorHint);
        if (el && getVisibleRect(el)) return el;
      } catch {
      }
    }
    const candidates = Array.from(document.querySelectorAll("article, aside, section, main, nav, div, form"));
    let best = null;
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

  // src/content/overlay.ts
  var Overlay = class {
    constructor(callbacks) {
      this.handles = [];
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
      this.selectionBox.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.callbacks.onGroupDoubleClick();
      });
      this.labelTag = document.createElement("div");
      this.labelTag.className = "genie-label-tag";
      this.labelTag.setAttribute(GENIE_ATTR, "label");
      this.sizeLabel = document.createElement("div");
      this.sizeLabel.className = "genie-size-label";
      this.sizeLabel.setAttribute(GENIE_ATTR, "size");
      this.root.append(this.svg, this.hoverBox, this.selectionBox, this.labelTag, this.sizeLabel);
      this.root.addEventListener("click", (e) => {
        if (e.target === this.root || e.target === this.svg) {
          this.callbacks.onBackgroundClick();
        }
      });
    }
    mount() {
      document.documentElement.appendChild(this.root);
      this.resizeSvg();
      window.addEventListener("resize", () => this.resizeSvg());
    }
    unmount() {
      this.root.remove();
    }
    resizeSvg() {
      const w = document.documentElement.scrollWidth;
      const h = document.documentElement.scrollHeight;
      this.svg.setAttribute("width", String(w));
      this.svg.setAttribute("height", String(h));
      this.svg.style.width = `${w}px`;
      this.svg.style.height = `${h}px`;
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
      const d = points.map((p, i) => {
        const x = p.x - window.scrollX;
        const y = p.y - window.scrollY;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ") + " Z";
      this.lassoPath.setAttribute("d", d);
    }
    clearLasso() {
      this.lassoPath.setAttribute("d", "");
    }
    showSelection(rect, label) {
      this.selectionBox.style.display = "block";
      this.updateSelectionRect(rect);
      this.labelTag.style.display = label ? "block" : "none";
      if (label) {
        this.labelTag.textContent = label;
        this.labelTag.style.transform = `translate(${rect.x - window.scrollX}px, ${rect.y - window.scrollY - 28}px)`;
      }
      this.sizeLabel.textContent = `${Math.round(rect.width)} \xD7 ${Math.round(rect.height)}`;
      this.sizeLabel.style.display = "block";
      this.sizeLabel.style.transform = `translate(${rect.x - window.scrollX + rect.width / 2 - 40}px, ${rect.y - window.scrollY + rect.height + 8}px)`;
    }
    updateSelectionRect(rect) {
      this.selectionBox.style.transform = `translate(${rect.x - window.scrollX}px, ${rect.y - window.scrollY}px)`;
      this.selectionBox.style.width = `${rect.width}px`;
      this.selectionBox.style.height = `${rect.height}px`;
      this.sizeLabel.textContent = `${Math.round(rect.width)} \xD7 ${Math.round(rect.height)}`;
      this.sizeLabel.style.transform = `translate(${rect.x - window.scrollX + rect.width / 2 - 40}px, ${rect.y - window.scrollY + rect.height + 8}px)`;
    }
    hideSelection() {
      this.selectionBox.style.display = "none";
      this.labelTag.style.display = "none";
      this.sizeLabel.style.display = "none";
      this.clearHandles();
    }
    renderHandles(onHandleDown) {
      this.clearHandles();
      const corners = ["nw", "ne", "sw", "se"];
      for (const corner of corners) {
        const handle = document.createElement("div");
        handle.className = `genie-handle genie-handle-${corner}`;
        handle.setAttribute(GENIE_ATTR, "handle");
        handle.dataset.corner = corner;
        handle.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          onHandleDown(corner, e);
        });
        this.selectionBox.appendChild(handle);
        this.handles.push(handle);
      }
    }
    clearHandles() {
      for (const h of this.handles) h.remove();
      this.handles = [];
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

  // src/content/patchEngine.ts
  var applied = /* @__PURE__ */ new Map();
  function storeOriginal(el, key) {
    const existing = applied.get(key);
    if (existing) return existing;
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
      "display"
    ]) {
      originalStyle[prop] = el.style.getPropertyValue(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)) || "";
    }
    const state = { element: el, originalStyle, hidden: false };
    applied.set(key, state);
    return state;
  }
  function applyOperations(groupId, element, operations) {
    const state = storeOriginal(element, groupId);
    let translateX = 0;
    let translateY = 0;
    for (const op of operations) {
      if (op.targetId !== groupId) continue;
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
  function getElementTransform(element) {
    const match = element.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    return { x: match ? parseFloat(match[1]) : 0, y: match ? parseFloat(match[2]) : 0 };
  }
  function buildOperationsFromManualEdit(groupId, element, baseOps) {
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

  // src/content/persistence.ts
  async function loadAndApplyCustomizations() {
    const { domain, path } = getPageContext();
    try {
      const data = await apiGet(
        `/api/customizations?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(path)}`
      );
      for (const c of data.customizations) {
        applyCustomization(c);
      }
    } catch (err) {
      console.warn("[genie] could not load customizations", err);
    }
  }
  function applyCustomization(c) {
    const el = resolveTargetElement(c.target);
    if (!el || !(el instanceof HTMLElement)) return;
    el.setAttribute("data-genie-group", c.groupId);
    applyOperations(c.groupId, el, c.operations);
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
  var EditModeController = class {
    constructor() {
      this.state = "off";
      this.overlay = null;
      this.lasso = new LassoController();
      this.panel = null;
      this.selectedGroup = null;
      this.targetElement = null;
      this.operations = [];
      this.dragState = createDragState();
      this.observer = null;
      this.onMouseMove = (e) => {
        if (this.state === "off" || this.lasso.isActive() || this.dragState.dragging || this.dragState.resizing) return;
        const stack = document.elementsFromPoint(e.clientX, e.clientY);
        const el = stack.find((node) => !isGenieElement(node) && node !== document.body && node !== document.documentElement);
        if (!el) {
          this.overlay?.hideHover();
          return;
        }
        const rect = getVisibleRect(el);
        if (rect) {
          this.overlay?.showHover(rect);
          this.state = "hovering";
        }
      };
      this.onPointerDown = (e) => {
        if (this.state === "off" || !this.overlay) return;
        const target = e.target;
        if (!target.closest(".genie-overlay-root") && !target.closest(".genie-panel")) return;
        if (target.closest(".genie-selection-box") && this.selectedGroup) {
          if (e.target.closest(".genie-handle")) return;
          const rect = this.selectedGroup.shape.rect;
          const translate = this.targetElement ? getElementTransform(this.targetElement) : { x: 0, y: 0 };
          startDrag(this.dragState, e, rect, translate);
          this.state = "dragging";
          e.target.setPointerCapture?.(e.pointerId);
          return;
        }
        if (this.lasso.isActive() || this.state === "agent-open") return;
        if (target.closest(".genie-panel")) return;
        this.lasso.start(e.clientX, e.clientY);
        this.state = "selecting";
        this.overlay.hideSelection();
        this.closePanel();
      };
      this.onPointerMove = (e) => {
        if (!this.overlay) return;
        if (this.dragState.dragging && this.selectedGroup && this.targetElement) {
          const { translateX, translateY, rect } = updateDrag(this.dragState, e);
          this.targetElement.style.transform = `translate(${translateX}px, ${translateY}px)`;
          this.selectedGroup.shape.rect = rect;
          this.overlay.updateSelectionRect(rect);
          return;
        }
        if (this.dragState.resizing && this.selectedGroup && this.targetElement) {
          const rect = updateResize(this.dragState, e);
          this.selectedGroup.shape.rect = rect;
          this.targetElement.style.width = `${rect.width}px`;
          this.targetElement.style.height = `${rect.height}px`;
          this.targetElement.style.overflow = "hidden";
          this.overlay.updateSelectionRect(rect);
          return;
        }
        if (this.lasso.isActive()) {
          const points = this.lasso.move(e.clientX, e.clientY);
          this.overlay.drawLasso(points);
        }
      };
      this.onPointerUp = (e) => {
        if (this.dragState.dragging || this.dragState.resizing) {
          endDragResize(this.dragState);
          if (this.selectedGroup) {
            this.operations = buildOperationsFromManualEdit(
              this.selectedGroup.groupId,
              this.targetElement,
              this.operations
            );
          }
          this.state = "group-selected";
          return;
        }
        if (this.lasso.isActive()) {
          const points = this.lasso.end();
          this.overlay.clearLasso();
          if (points.length > 4) {
            this.onLassoComplete(points);
          }
          this.lasso.reset();
        }
      };
    }
    async enter() {
      if (this.state !== "off") return;
      document.body.classList.add("genie-editing");
      this.overlay = new Overlay({
        onLassoComplete: (pts) => this.onLassoComplete(pts),
        onBackgroundClick: () => this.closePanel(),
        onGroupDoubleClick: () => this.openAgentPanel()
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
      this.observer = setupReapplyObserver();
    }
    exit() {
      document.body.classList.remove("genie-editing");
      this.unbindEvents();
      this.panel?.unmount();
      this.overlay?.unmount();
      this.observer?.disconnect();
      this.selectedGroup = null;
      this.targetElement = null;
      this.operations = [];
      this.overlay = null;
      this.panel = null;
      this.state = "off";
    }
    bindEvents() {
      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("pointerdown", this.onPointerDown);
      document.addEventListener("pointermove", this.onPointerMove);
      document.addEventListener("pointerup", this.onPointerUp);
    }
    unbindEvents() {
      document.removeEventListener("mousemove", this.onMouseMove);
      document.removeEventListener("pointerdown", this.onPointerDown);
      document.removeEventListener("pointermove", this.onPointerMove);
      document.removeEventListener("pointerup", this.onPointerUp);
    }
    async onLassoComplete(points) {
      const elements = collectElementsFromLasso(points);
      const container = findBestGroupContainer(elements);
      if (!container || !(container instanceof HTMLElement)) return;
      const rect = getVisibleRect(container);
      const { domain, path } = getPageContext();
      const groupId = createGroupId();
      const domSummary = elements.slice(0, 12).map((el, i) => summarizeElement(el, i)).filter(Boolean);
      const target = buildTargetSignature(container);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const group = {
        groupId,
        userId: DEMO_USER_ID,
        domain,
        path,
        shape: { type: "lasso", rect, points },
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
      this.selectGroup(group, container);
    }
    selectGroup(group, element) {
      this.selectedGroup = group;
      this.targetElement = element;
      element.setAttribute("data-genie-group", group.groupId);
      this.operations = [];
      this.overlay?.showSelection(group.shape.rect, group.label);
      this.overlay?.renderHandles((corner, e) => {
        startResize(this.dragState, corner, e, group.shape.rect);
        this.state = "resizing";
        e.target.setPointerCapture(e.pointerId);
      });
      this.state = "group-selected";
    }
    openAgentPanel() {
      if (!this.selectedGroup || !this.overlay || !this.panel) return;
      this.panel.positionBeside(this.selectedGroup.shape.rect, this.selectedGroup.label);
      this.state = "agent-open";
    }
    closePanel() {
      this.panel?.hide();
      if (this.selectedGroup) this.state = "group-selected";
      else this.state = "hovering";
    }
    async runAgent(instruction) {
      if (!this.selectedGroup || !this.panel || !this.targetElement) return;
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
          group: this.selectedGroup,
          instruction
        });
        this.operations = result.operations;
        applyOperations(this.selectedGroup.groupId, this.targetElement, result.operations);
        this.selectedGroup.label = result.sectionLabel;
        this.overlay?.showSelection(this.selectedGroup.shape.rect, result.sectionLabel);
        this.panel.showResult(result);
      } catch (err) {
        this.panel.showError(String(err));
      }
    }
    async saveCurrent() {
      if (!this.selectedGroup || !this.panel) return;
      const ops = this.targetElement && this.operations.length ? buildOperationsFromManualEdit(this.selectedGroup.groupId, this.targetElement, this.operations) : this.operations;
      try {
        await saveCustomization(this.selectedGroup.groupId, this.selectedGroup.target, ops);
        this.panel.showSaved();
      } catch (err) {
        this.panel.showError(String(err));
      }
    }
  };
  var editMode = new EditModeController();
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GENIE_TOGGLE_EDIT_MODE") {
      if (editMode.state === "off") {
        editMode.enter().then(() => sendResponse({ active: true }));
      } else {
        editMode.exit();
        sendResponse({ active: false });
      }
      return true;
    }
    if (msg.type === "GENIE_GET_STATE") {
      sendResponse({ active: editMode.state !== "off" });
      return true;
    }
  });

  // src/content/index.ts
  console.log("[genie] content script loaded");
})();
//# sourceMappingURL=content.js.map
