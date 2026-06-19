import type { PatchOperation } from "../../../shared/contracts";
import type { AgentTraceViewProps } from "./agentTraceTypes";
import { buildTimeline } from "./agentTraceApi";

export class AgentTraceView {
  readonly root: HTMLDivElement;
  private metaEl: HTMLDivElement;
  private timelineEl: HTMLDivElement;
  private opsEl: HTMLDivElement;
  private footerEl: HTMLDivElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "agent-trace";
    this.root.innerHTML = `
      <header class="agent-trace-header">
        <div class="agent-trace-heading">
          <div class="agent-trace-title-row">
            <span class="agent-trace-mark" aria-hidden="true">◎</span>
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

    this.metaEl = this.root.querySelector(".agent-trace-meta") as HTMLDivElement;
    this.timelineEl = this.root.querySelector(".agent-trace-timeline") as HTMLDivElement;
    this.opsEl = this.root.querySelector(".agent-trace-ops") as HTMLDivElement;
    this.footerEl = this.root.querySelector(".agent-trace-footer") as HTMLDivElement;
  }

  render(props: AgentTraceViewProps): void {
    if (props.loading) {
      this.root.classList.add("is-loading");
      this.metaEl.innerHTML = `<p class="agent-trace-loading">Loading latest agent run…</p>`;
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
        ${
          run.intent
            ? `<div class="agent-trace-meta-item agent-trace-meta-wide">
          <span class="agent-trace-meta-label">OpenInfer intent</span>
          <span class="agent-trace-meta-value agent-trace-meta-muted">${escapeHtml(run.intent)}</span>
        </div>`
            : ""
        }
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

  private renderTimeline(run: AgentTraceViewProps["run"]): void {
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

  private renderOperations(ops: PatchOperation[]): void {
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

  private renderFooter(
    source: AgentTraceViewProps["source"],
    critique?: { safe: boolean; reason: string },
  ): void {
    const sourceLabel =
      source === "live"
        ? "Live data from GET /api/agent-runs"
        : "Mock fallback — backend offline or no runs yet";

    this.footerEl.innerHTML = `
      <div class="agent-trace-footer-row">
        <span class="agent-trace-source agent-trace-source-${source}">${escapeHtml(sourceLabel)}</span>
        ${
          critique
            ? `<span class="agent-trace-critique ${critique.safe ? "is-safe" : "is-unsafe"}">
            ${critique.safe ? "✓ Safe patch" : "⚠ Review needed"} · ${escapeHtml(critique.reason)}
          </span>`
            : ""
        }
      </div>
      <p class="agent-trace-note">Genie edits only the double-clicked group — not the whole page.</p>
    `;
  }
}

function createOperationPill(op: PatchOperation): HTMLSpanElement {
  const pill = document.createElement("span");
  pill.className = "agent-trace-op-pill";

  if (op.type === "style") {
    const cssKeys = Object.keys(op.css ?? {}).join(", ");
    pill.textContent = `style · ${cssKeys || "css"}`;
    pill.title = JSON.stringify(op.css);
  } else if (op.type === "move") {
    pill.textContent = `move · Δ${op.translateX ?? 0}, ${op.translateY ?? 0}`;
  } else if (op.type === "resize") {
    pill.textContent = `resize · ${op.width ?? "—"}×${op.height ?? "—"}`;
  } else {
    pill.textContent = op.type;
  }

  return pill;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
