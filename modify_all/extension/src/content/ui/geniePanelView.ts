import { GENIE_ATTR } from "../grouping";
import type { GeniePanelProps, GeniePanelViewCallbacks, GenieQuickAction } from "./geniePanelTypes";
import { STATUS_COPY } from "./geniePanelTypes";

export class GeniePanelView {
  readonly root: HTMLDivElement;
  private contextEl: HTMLDivElement;
  private chipsEl: HTMLDivElement;
  private promptEl: HTMLTextAreaElement;
  private statusEl: HTMLDivElement;
  private statusDotEl: HTMLSpanElement;
  private callbacks: GeniePanelViewCallbacks;
  private props: GeniePanelProps;

  constructor(callbacks: GeniePanelViewCallbacks, initialProps?: Partial<GeniePanelProps>) {
    this.callbacks = callbacks;
    this.props = {
      visible: false,
      sectionLabel: "Section",
      contextMessage: "",
      placeholder: "Ask agent...",
      promptValue: "",
      quickActions: [],
      selectedQuickActionId: null,
      status: "idle",
      statusMessage: "",
      position: { left: 24, top: 24 },
      ...initialProps,
    };

    this.root = document.createElement("div");
    this.root.className = "genie-panel";
    this.root.setAttribute(GENIE_ATTR, "panel");
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Genie AI Agent");
    this.root.innerHTML = `
      <div class="genie-panel-header">
        <div class="genie-panel-title-row">
          <span class="genie-agent-dot" aria-hidden="true"></span>
          <div class="genie-panel-title">AI Agent</div>
        </div>
        <button type="button" class="genie-panel-close" data-action="close" aria-label="Close Genie panel">×</button>
      </div>
      <div class="genie-panel-context"></div>
      <div class="genie-quick-actions" role="group" aria-label="Quick actions"></div>
      <label class="genie-prompt-label">
        <span class="genie-sr-only">Section edit prompt</span>
        <textarea class="genie-prompt" rows="2"></textarea>
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

    this.contextEl = this.root.querySelector(".genie-panel-context") as HTMLDivElement;
    this.chipsEl = this.root.querySelector(".genie-quick-actions") as HTMLDivElement;
    this.promptEl = this.root.querySelector(".genie-prompt") as HTMLTextAreaElement;
    this.statusEl = this.root.querySelector(".genie-panel-status") as HTMLDivElement;
    this.statusDotEl = this.root.querySelector(".genie-status-dot") as HTMLSpanElement;

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

  updateProps(next: Partial<GeniePanelProps>): void {
    this.props = { ...this.props, ...next };
    this.render(this.props);
  }

  getPromptValue(): string {
    return this.promptEl.value.trim();
  }

  private render(props: GeniePanelProps): void {
    this.root.style.display = props.visible ? "flex" : "none";
    if (!props.visible) return;

    this.root.style.transform = `translate(${props.position.left}px, ${props.position.top}px)`;
    this.contextEl.textContent =
      props.contextMessage ||
      `I noticed you've selected ${props.sectionLabel}. What would you like to do?`;
    this.promptEl.placeholder = props.placeholder;
    if (this.promptEl.value !== props.promptValue) {
      this.promptEl.value = props.promptValue;
    }

    this.renderChips(props.quickActions, props.selectedQuickActionId ?? null);
    this.renderStatus(props);
  }

  private renderChips(actions: GenieQuickAction[], selectedId: string | null): void {
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

  private renderStatus(props: GeniePanelProps): void {
    const message = props.statusMessage || STATUS_COPY[props.status];
    const textEl = this.statusEl.querySelector(".genie-status-text") as HTMLSpanElement;
    textEl.textContent = message;

    this.statusEl.className = "genie-panel-status";
    this.statusEl.classList.add(`genie-status-${props.status}`);
    this.statusDotEl.className = "genie-status-dot";
    if (props.status === "loading") {
      this.statusDotEl.classList.add("is-loading");
    }
  }
}
