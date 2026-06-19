type ContentEditModeState = "off" | "hovering";

type ContentRuntimeMessage =
  | {
      type: "GENIE_SET_EDIT_MODE";
      enabled: boolean;
    }
  | {
      type: "GENIE_GET_EDIT_MODE";
    };

type ContentRuntimeResponse =
  | {
      ok: true;
      state: ContentEditModeState;
      enabled: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const ROOT_ID = "genie-extension-root";
const STYLE_ID = "genie-extension-style";

const OVERLAY_MARKUP = `
  <div class="genie-overlay" data-genie-overlay>
    <div class="genie-overlay__badge">Genie Edit Mode</div>
  </div>
`;

function ensureStyleTag(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }

    #${ROOT_ID}[data-enabled="false"] {
      display: none;
    }

    #${ROOT_ID} .genie-overlay {
      position: absolute;
      inset: 0;
      outline: 2px solid rgba(37, 99, 235, 0.45);
      outline-offset: -2px;
      background:
        linear-gradient(rgba(37, 99, 235, 0.06), rgba(37, 99, 235, 0.06)),
        linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px),
        linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px);
      background-size: auto, 24px 24px, 24px 24px;
    }

    #${ROOT_ID} .genie-overlay__badge {
      position: absolute;
      top: 16px;
      right: 16px;
      border-radius: 999px;
      padding: 8px 12px;
      background: rgba(15, 23, 42, 0.9);
      color: #ffffff;
      font: 600 12px/1 Arial, sans-serif;
      letter-spacing: 0.02em;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.22);
    }

    body.genie-editing {
      cursor: crosshair !important;
    }
  `;

  document.head.appendChild(style);
}

class EditModeOverlay {
  private readonly root: HTMLDivElement;

  constructor() {
    ensureStyleTag();

    const existing = document.getElementById(ROOT_ID);
    if (existing instanceof HTMLDivElement) {
      this.root = existing;
      return;
    }

    this.root = document.createElement("div");
    this.root.id = ROOT_ID;
    this.root.dataset.enabled = "false";
    this.root.setAttribute("aria-hidden", "true");
    this.root.innerHTML = OVERLAY_MARKUP;
    document.documentElement.appendChild(this.root);
  }

  setEnabled(enabled: boolean): void {
    this.root.dataset.enabled = String(enabled);
    document.body.classList.toggle("genie-editing", enabled);
  }
}

class EditModeController {
  private state: ContentEditModeState = "off";
  private readonly overlay = new EditModeOverlay();

  constructor() {
    this.overlay.setEnabled(false);
  }

  handleMessage(message: ContentRuntimeMessage): ContentRuntimeResponse {
    if (message.type === "GENIE_GET_EDIT_MODE") {
      return this.getStateResponse();
    }

    if (message.type === "GENIE_SET_EDIT_MODE") {
      this.setEnabled(message.enabled);
      return this.getStateResponse();
    }

    return {
      ok: false,
      error: "Unsupported Genie message.",
    };
  }

  private setEnabled(enabled: boolean): void {
    this.state = enabled ? "hovering" : "off";
    this.overlay.setEnabled(enabled);
  }

  private getStateResponse(): ContentRuntimeResponse {
    return {
      ok: true,
      state: this.state,
      enabled: this.state !== "off",
    };
  }
}

const controller = new EditModeController();

if (chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    sendResponse(controller.handleMessage(message as ContentRuntimeMessage));
    return false;
  });
}
