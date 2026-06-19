export type QuickActionId =
  | "dark-mode"
  | "compact"
  | "hide"
  | "move-lower"
  | "match-style";

export type GeniePanelStatus =
  | "idle"
  | "loading"
  | "preview-ready"
  | "saved"
  | "error";

export type GenieQuickAction = {
  id: QuickActionId;
  label: string;
  /** Prefill for the scoped prompt when a chip is selected */
  prompt: string;
};

export type GeniePanelPosition = {
  left: number;
  top: number;
};

export type GeniePanelProps = {
  visible: boolean;
  sectionLabel: string;
  contextMessage?: string;
  placeholder: string;
  promptValue: string;
  quickActions: GenieQuickAction[];
  selectedQuickActionId?: QuickActionId | null;
  status: GeniePanelStatus;
  statusMessage?: string;
  position: GeniePanelPosition;
};

export type GeniePanelViewCallbacks = {
  onPromptChange: (value: string) => void;
  onQuickActionSelect: (action: GenieQuickAction) => void;
  onPreview: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export const GENIE_PANEL_PLACEHOLDER = "Ask agent...";

export const DEFAULT_QUICK_ACTIONS: GenieQuickAction[] = [
  { id: "dark-mode", label: "🌙 Dark mode", prompt: "Apply dark mode to this group" },
  { id: "compact", label: "📐 Compact", prompt: "Make this group more compact" },
  { id: "hide", label: "👁 Hide", prompt: "Hide this group" },
  { id: "move-lower", label: "⬇ Move lower", prompt: "Move this group lower on the page" },
  { id: "match-style", label: "✨ Match my style", prompt: "Match my saved style preferences" },
];

export const DEFAULT_GENIE_PANEL_PROPS: GeniePanelProps = {
  visible: false,
  sectionLabel: "Section",
  placeholder: GENIE_PANEL_PLACEHOLDER,
  promptValue: "",
  quickActions: DEFAULT_QUICK_ACTIONS,
  selectedQuickActionId: null,
  status: "idle",
  statusMessage: "",
  position: { left: 24, top: 24 },
};

export const STATUS_COPY: Record<GeniePanelStatus, string> = {
  idle: "",
  loading: "Thinking with OpenInfer...",
  "preview-ready": "Preview ready",
  saved: "Saved to MongoDB",
  error: "Could not apply patch",
};
