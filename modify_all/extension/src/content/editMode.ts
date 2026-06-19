import type {
  GenieEditModeState,
  GenieRuntimeMessage,
  GenieRuntimeResponse,
} from "../shared/messages";
import { EditModeOverlay } from "./overlay";

export class EditModeController {
  private state: GenieEditModeState = "off";
  private readonly overlay = new EditModeOverlay();

  constructor() {
    this.overlay.setEnabled(false);
  }

  handleMessage(message: GenieRuntimeMessage): GenieRuntimeResponse {
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

  private getStateResponse(): GenieRuntimeResponse {
    return {
      ok: true,
      state: this.state,
      enabled: this.state !== "off",
    };
  }
}
