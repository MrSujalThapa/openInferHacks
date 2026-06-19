import type { GeniePanelProps } from "./geniePanelTypes";
import {
  DEFAULT_GENIE_PANEL_PROPS,
  DEFAULT_QUICK_ACTIONS,
  GENIE_PANEL_PLACEHOLDER,
} from "./geniePanelTypes";

/** Mock props for UI review and integration testing without a live agent. */
export const MOCK_GENIE_PANEL_PROPS: GeniePanelProps = {
  visible: true,
  sectionLabel: "News Sidebar",
  placeholder: GENIE_PANEL_PLACEHOLDER,
  promptValue: "Make this compact dark mode and less distracting.",
  quickActions: DEFAULT_QUICK_ACTIONS,
  selectedQuickActionId: "dark-mode",
  status: "preview-ready",
  statusMessage: "Preview ready — 2 operation(s)",
  position: { left: 680, top: 120 },
};

export const MOCK_GENIE_PANEL_LOADING: GeniePanelProps = {
  ...MOCK_GENIE_PANEL_PROPS,
  status: "loading",
  statusMessage: "Thinking with OpenInfer...",
  selectedQuickActionId: null,
};

export const MOCK_GENIE_PANEL_IDLE: GeniePanelProps = {
  ...DEFAULT_GENIE_PANEL_PROPS,
  visible: true,
  sectionLabel: "News Sidebar",
  position: { left: 680, top: 120 },
};
