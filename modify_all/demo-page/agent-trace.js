"use strict";
(() => {
  // src/content/ui/mockAgentTrace.ts
  var MOCK_AGENT_RUN = {
    traceId: "trace_demo_news_sidebar",
    groupId: "group_news_sidebar",
    sectionLabel: "News Sidebar",
    instruction: "Make this compact dark mode and less distracting.",
    intent: "reduce visual prominence while preserving readability",
    domain: "linkedin.com",
    path: "/feed",
    critique: {
      safe: true,
      reason: "Operations affect only the selected group and use allowed properties."
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    steps: [
      {
        name: "LoadStyleMemory",
        status: "success",
        outputPreview: { count: 1 },
        startedAt: new Date(Date.now() - 4200).toISOString(),
        finishedAt: new Date(Date.now() - 4100).toISOString()
      },
      {
        name: "OpenInferUnderstandSection",
        status: "success",
        outputPreview: { label: "News Sidebar", sectionType: "right_sidebar", confidence: 0.91 },
        startedAt: new Date(Date.now() - 4e3).toISOString(),
        finishedAt: new Date(Date.now() - 3600).toISOString()
      },
      {
        name: "OpenInferInterpretIntent",
        status: "success",
        outputPreview: { intent: "reduce visual prominence while preserving readability" },
        startedAt: new Date(Date.now() - 3500).toISOString(),
        finishedAt: new Date(Date.now() - 3100).toISOString()
      },
      {
        name: "OpenInferPlanPatch",
        status: "success",
        outputPreview: { operations: 2 },
        startedAt: new Date(Date.now() - 3e3).toISOString(),
        finishedAt: new Date(Date.now() - 2400).toISOString()
      },
      {
        name: "ValidatePatch",
        status: "success",
        outputPreview: { valid: true, rejected: 0 },
        startedAt: new Date(Date.now() - 2300).toISOString(),
        finishedAt: new Date(Date.now() - 2200).toISOString()
      },
      {
        name: "OpenInferCritiquePatch",
        status: "success",
        outputPreview: { safe: true, reason: "Patch only affects the selected group." },
        startedAt: new Date(Date.now() - 2100).toISOString(),
        finishedAt: new Date(Date.now() - 1700).toISOString()
      },
      {
        name: "RepairOrFinalize",
        status: "success",
        outputPreview: { operations: 2 },
        startedAt: new Date(Date.now() - 1600).toISOString(),
        finishedAt: new Date(Date.now() - 1500).toISOString()
      },
      {
        name: "LogAgentRun",
        status: "success",
        outputPreview: { traceId: "trace_demo_news_sidebar" },
        startedAt: new Date(Date.now() - 1400).toISOString(),
        finishedAt: new Date(Date.now() - 1300).toISOString()
      }
    ],
    finalPatch: [
      { type: "compact", targetId: "group_news_sidebar" },
      {
        type: "style",
        targetId: "group_news_sidebar",
        css: {
          backgroundColor: "#111827",
          color: "#f9fafb",
          borderRadius: "16px",
          opacity: "0.86"
        }
      }
    ]
  };

  // src/content/ui/agentTraceApi.ts
  var API_BASE = "http://localhost:4000";
  var STEP_TO_TIMELINE = {
    LoadStyleMemory: "Retrieved style memory",
    OpenInferUnderstandSection: "Understood section with OpenInfer",
    OpenInferInterpretIntent: "Interpreted user intent",
    OpenInferPlanPatch: "Planned patch",
    ValidatePatch: "Validated safe operations",
    OpenInferCritiquePatch: "Critiqued patch",
    RepairOrFinalize: "Repaired or finalized patch",
    LogAgentRun: "Saved customization to MongoDB"
  };
  function timelineLabelForStep(stepName) {
    return STEP_TO_TIMELINE[stepName] ?? stepName;
  }
  async function fetchLatestAgentRun() {
    try {
      const res = await fetch(`${API_BASE}/api/agent-runs?limit=1`, { signal: AbortSignal.timeout(4e3) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.runs?.[0];
      if (!raw) throw new Error("No agent runs");
      return { run: normalizeAgentRun(raw), source: "live" };
    } catch {
      return { run: MOCK_AGENT_RUN, source: "mock" };
    }
  }
  function normalizeAgentRun(raw) {
    const steps = Array.isArray(raw.steps) ? raw.steps.map(normalizeStep) : [];
    const finalPatch = Array.isArray(raw.finalPatch) ? raw.finalPatch : [];
    const intent = extractIntent(steps);
    return {
      traceId: String(raw.traceId ?? "unknown"),
      groupId: String(raw.groupId ?? "unknown"),
      sectionLabel: extractSectionLabel(steps) ?? String(raw.groupId ?? "Selected section"),
      instruction: String(raw.instruction ?? ""),
      intent,
      domain: raw.domain ? String(raw.domain) : void 0,
      path: raw.path ? String(raw.path) : void 0,
      steps,
      finalPatch,
      critique: extractCritique(steps),
      createdAt: toIso(raw.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function normalizeStep(raw) {
    const step = raw;
    return {
      name: String(step.name ?? "Unknown"),
      status: step.status ?? "success",
      inputPreview: step.inputPreview,
      outputPreview: step.outputPreview,
      error: step.error ? String(step.error) : void 0,
      startedAt: toIso(step.startedAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
      finishedAt: toIso(step.finishedAt) ?? (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function toIso(value) {
    if (!value) return void 0;
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }
  function extractSectionLabel(steps) {
    const understand = steps.find((s) => s.name === "OpenInferUnderstandSection");
    const out = understand?.outputPreview;
    return out?.label;
  }
  function extractIntent(steps) {
    const interpret = steps.find((s) => s.name === "OpenInferInterpretIntent");
    const out = interpret?.outputPreview;
    return out?.intent;
  }
  function extractCritique(steps) {
    const critique = steps.find((s) => s.name === "OpenInferCritiquePatch");
    const out = critique?.outputPreview;
    if (out && typeof out.safe === "boolean") {
      return { safe: out.safe, reason: String(out.reason ?? "") };
    }
    return void 0;
  }
  function buildTimeline(run) {
    const items = [
      {
        id: "loaded-group",
        label: "Loaded selected group",
        status: "success",
        detail: run.sectionLabel
      }
    ];
    for (const step of run.steps) {
      if (step.name === "OpenInferInterpretIntent") continue;
      if (step.name === "RepairOrFinalize") continue;
      let detail;
      if (step.name === "LoadStyleMemory") {
        const out = step.outputPreview;
        detail = out?.count != null ? `${out.count} memory item(s)` : void 0;
      }
      if (step.name === "OpenInferUnderstandSection") {
        const out = step.outputPreview;
        if (out?.sectionType) {
          detail = out.confidence != null ? `${out.sectionType} \xB7 ${Math.round(out.confidence * 100)}% confidence` : out.sectionType;
        }
      }
      if (step.name === "OpenInferPlanPatch") {
        const out = step.outputPreview;
        const count = Array.isArray(out?.operations) ? out.operations.length : out?.operations;
        if (count != null) detail = `${count} operation(s)`;
      }
      if (step.name === "ValidatePatch") {
        const out = step.outputPreview;
        if (out?.valid === false) detail = `${out.rejected ?? 0} rejected`;
        else detail = "All operations allowed";
      }
      if (step.name === "OpenInferCritiquePatch" && run.critique) {
        detail = run.critique.reason;
      }
      if (step.name === "LogAgentRun") {
        detail = run.traceId;
      }
      items.push({
        id: step.name,
        label: timelineLabelForStep(step.name),
        status: step.status,
        detail
      });
    }
    return items;
  }

  // src/content/ui/agentTraceView.ts
  var AgentTraceView = class {
    constructor() {
      this.root = document.createElement("div");
      this.root.className = "agent-trace";
      this.root.innerHTML = `
      <header class="agent-trace-header">
        <div class="agent-trace-heading">
          <div class="agent-trace-title-row">
            <span class="agent-trace-mark" aria-hidden="true">\u25CE</span>
            <h1 class="agent-trace-title">Agent Trace</h1>
          </div>
          <p class="agent-trace-subtitle">Section-scoped OpenInfer workflow</p>
        </div>
        <div class="agent-trace-badges" aria-label="Technologies">
          <span class="agent-trace-badge">OpenInfer</span>
          <span class="agent-trace-badge">LangGraph</span>
          <span class="agent-trace-badge agent-trace-badge-mongo">MongoDB</span>
        </div>
      </header>
      <div class="agent-trace-meta"></div>
      <section class="agent-trace-section" aria-labelledby="agent-trace-timeline-heading">
        <h2 id="agent-trace-timeline-heading" class="agent-trace-section-title">Workflow</h2>
        <ol class="agent-trace-timeline"></ol>
      </section>
      <section class="agent-trace-section" aria-labelledby="agent-trace-ops-heading">
        <h2 id="agent-trace-ops-heading" class="agent-trace-section-title">Final patch operations</h2>
        <div class="agent-trace-ops"></div>
      </section>
      <footer class="agent-trace-footer"></footer>
    `;
      this.metaEl = this.root.querySelector(".agent-trace-meta");
      this.timelineEl = this.root.querySelector(".agent-trace-timeline");
      this.opsEl = this.root.querySelector(".agent-trace-ops");
      this.footerEl = this.root.querySelector(".agent-trace-footer");
    }
    render(props) {
      if (props.loading) {
        this.root.classList.add("is-loading");
        this.metaEl.innerHTML = `<p class="agent-trace-loading">Loading latest agent run\u2026</p>`;
        this.timelineEl.replaceChildren();
        this.opsEl.replaceChildren();
        this.footerEl.replaceChildren();
        return;
      }
      this.root.classList.remove("is-loading");
      const { run, source } = props;
      this.metaEl.innerHTML = `
      <div class="agent-trace-meta-grid">
        <div class="agent-trace-meta-item">
          <span class="agent-trace-meta-label">Section</span>
          <span class="agent-trace-meta-value">${escapeHtml(run.sectionLabel)}</span>
        </div>
        <div class="agent-trace-meta-item agent-trace-meta-wide">
          <span class="agent-trace-meta-label">Instruction</span>
          <span class="agent-trace-meta-value">"${escapeHtml(run.instruction)}"</span>
        </div>
        ${run.intent ? `<div class="agent-trace-meta-item agent-trace-meta-wide">
          <span class="agent-trace-meta-label">OpenInfer intent</span>
          <span class="agent-trace-meta-value agent-trace-meta-muted">${escapeHtml(run.intent)}</span>
        </div>` : ""}
        <div class="agent-trace-meta-item">
          <span class="agent-trace-meta-label">Trace ID</span>
          <span class="agent-trace-meta-value agent-trace-mono">${escapeHtml(run.traceId)}</span>
        </div>
        <div class="agent-trace-meta-item">
          <span class="agent-trace-meta-label">Saved</span>
          <span class="agent-trace-meta-value">${formatTimestamp(run.createdAt)}</span>
        </div>
      </div>
    `;
      this.renderTimeline(run);
      this.renderOperations(run.finalPatch);
      this.renderFooter(source, run.critique);
    }
    renderTimeline(run) {
      this.timelineEl.replaceChildren();
      const items = buildTimeline(run);
      for (const item of items) {
        const li = document.createElement("li");
        li.className = `agent-trace-step agent-trace-step-${item.status}`;
        li.innerHTML = `
        <span class="agent-trace-step-marker" aria-hidden="true"></span>
        <div class="agent-trace-step-body">
          <span class="agent-trace-step-label">${escapeHtml(item.label)}</span>
          ${item.detail ? `<span class="agent-trace-step-detail">${escapeHtml(item.detail)}</span>` : ""}
        </div>
      `;
        this.timelineEl.appendChild(li);
      }
    }
    renderOperations(ops) {
      this.opsEl.replaceChildren();
      if (!ops.length) {
        this.opsEl.innerHTML = `<p class="agent-trace-empty">No operations recorded.</p>`;
        return;
      }
      const pills = document.createElement("div");
      pills.className = "agent-trace-op-pills";
      for (const op of ops) {
        pills.appendChild(createOperationPill(op));
      }
      this.opsEl.appendChild(pills);
      const json = document.createElement("details");
      json.className = "agent-trace-json";
      json.innerHTML = `
      <summary>Raw JSON</summary>
      <pre>${escapeHtml(JSON.stringify(ops, null, 2))}</pre>
    `;
      this.opsEl.appendChild(json);
    }
    renderFooter(source, critique) {
      const sourceLabel = source === "live" ? "Live data from GET /api/agent-runs" : "Mock fallback \u2014 backend offline or no runs yet";
      this.footerEl.innerHTML = `
      <div class="agent-trace-footer-row">
        <span class="agent-trace-source agent-trace-source-${source}">${escapeHtml(sourceLabel)}</span>
        ${critique ? `<span class="agent-trace-critique ${critique.safe ? "is-safe" : "is-unsafe"}">
            ${critique.safe ? "\u2713 Safe patch" : "\u26A0 Review needed"} \xB7 ${escapeHtml(critique.reason)}
          </span>` : ""}
      </div>
      <p class="agent-trace-note">Genie edits only the double-clicked group \u2014 not the whole page.</p>
    `;
    }
  };
  function createOperationPill(op) {
    const pill = document.createElement("span");
    pill.className = "agent-trace-op-pill";
    if (op.type === "style") {
      const cssKeys = Object.keys(op.css ?? {}).join(", ");
      pill.textContent = `style \xB7 ${cssKeys || "css"}`;
      pill.title = JSON.stringify(op.css);
    } else if (op.type === "move") {
      pill.textContent = `move \xB7 \u0394${op.translateX ?? 0}, ${op.translateY ?? 0}`;
    } else if (op.type === "resize") {
      pill.textContent = `resize \xB7 ${op.width ?? "\u2014"}\xD7${op.height ?? "\u2014"}`;
    } else {
      pill.textContent = op.type;
    }
    return pill;
  }
  function formatTimestamp(iso) {
    try {
      return new Date(iso).toLocaleString(void 0, {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      return iso;
    }
  }
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // src/content/ui/agentTrace.ts
  var AgentTracePanel = class {
    constructor(mountEl2) {
      this.mountEl = mountEl2;
      this.refreshTimer = null;
      this.view = new AgentTraceView();
      mountEl2.appendChild(this.view.root);
    }
    async load(options) {
      this.view.render({ run: {}, source: "mock", loading: true });
      const result = await fetchLatestAgentRun();
      this.view.render({ run: result.run, source: result.source });
      if (options?.autoRefreshMs) {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => void this.refresh(), options.autoRefreshMs);
      }
      return result;
    }
    async refresh() {
      const result = await fetchLatestAgentRun();
      this.view.render({ run: result.run, source: result.source });
    }
    showMock(run) {
      this.view.render({ run, source: "mock" });
    }
    destroy() {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.view.root.remove();
    }
  };

  // ../demo-page/agent-trace-main.ts
  var mountEl = document.getElementById("agent-trace-root");
  var refreshBtn = document.getElementById("refresh-trace");
  if (!mountEl) {
    throw new Error("Missing #agent-trace-root");
  }
  var panel = new AgentTracePanel(mountEl);
  void panel.load({ autoRefreshMs: 15e3 });
  refreshBtn?.addEventListener("click", () => void panel.refresh());
})();
//# sourceMappingURL=agent-trace.js.map
