import type { SectionEditAgentResult } from "../../../shared/contracts";
import type { Rect } from "../../../shared/contracts";
import { GeniePanelView } from "./geniePanelView";
import type { GeniePanelProps, GenieQuickAction, QuickActionId } from "./geniePanelTypes";
import {
  DEFAULT_GENIE_PANEL_PROPS,
  DEFAULT_QUICK_ACTIONS,
  GENIE_PANEL_PLACEHOLDER,
  STATUS_COPY,
} from "./geniePanelTypes";

export type GeniePanelCallbacks = {
  onPreview: (instruction: string) => void;
  onQuickAction: (instruction: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

const PANEL_WIDTH = 300;

export class GeniePanel {
  private view: GeniePanelView;
  private callbacks: GeniePanelCallbacks;
  private props: GeniePanelProps;

  constructor(callbacks: GeniePanelCallbacks, initialProps?: Partial<GeniePanelProps>) {
    this.callbacks = callbacks;
    this.props = {
      ...DEFAULT_GENIE_PANEL_PROPS,
      quickActions: DEFAULT_QUICK_ACTIONS,
      placeholder: GENIE_PANEL_PLACEHOLDER,
      ...initialProps,
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
        onCancel: () => this.callbacks.onCancel(),
      },
      this.props,
    );
  }

  mount(): void {
    document.documentElement.appendChild(this.view.root);
  }

  unmount(): void {
    this.view.root.remove();
  }

  positionBeside(rect: Rect, label?: string): void {
    this.props.visible = true;
    this.props.sectionLabel = label ?? "Section";
    this.props.contextMessage = `I noticed you've selected ${label ?? "this section"}. What would you like to do?`;
    this.props.status = "idle";
    this.props.statusMessage = "";
    this.props.position = computePanelPosition(rect);
    this.sync();
  }

  hide(): void {
    this.props = {
      ...this.props,
      visible: false,
      promptValue: "",
      selectedQuickActionId: null,
      status: "idle",
      statusMessage: "",
    };
    this.sync();
  }

  setLoading(): void {
    this.props.status = "loading";
    this.props.statusMessage = STATUS_COPY.loading;
    this.sync();
  }

  showResult(result: SectionEditAgentResult): void {
    this.props.status = "preview-ready";
    this.props.statusMessage = `Preview ready — ${result.operations.length} operation(s)`;
    this.props.sectionLabel = result.sectionLabel;
    this.sync();
  }

  showError(msg: string): void {
    this.props.status = "error";
    this.props.statusMessage = msg || STATUS_COPY.error;
    this.sync();
  }

  showSaved(): void {
    this.props.status = "saved";
    this.props.statusMessage = STATUS_COPY.saved;
    this.sync();
  }

  getInstruction(): string {
    return this.view.getPromptValue();
  }

  /** For UI preview / tests — render panel from mock props without selection wiring. */
  applyMockProps(mock: Partial<GeniePanelProps>): void {
    this.props = { ...this.props, ...mock };
    this.sync();
  }

  private handleQuickAction(action: GenieQuickAction): void {
    this.props.selectedQuickActionId = action.id as QuickActionId;
    this.props.promptValue = action.prompt;
    this.props.status = "idle";
    this.props.statusMessage = "";
    this.sync();
    this.callbacks.onQuickAction(action.prompt);
  }

  private sync(): void {
    this.view.updateProps(this.props);
  }
}

function computePanelPosition(rect: Rect): { left: number; top: number } {
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

export type { PatchOperation, SectionEditAgentResult } from "../../../shared/contracts";
