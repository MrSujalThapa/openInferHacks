import { EditModeOverlay } from "./overlay";
export class EditModeController {
    constructor() {
        this.state = "off";
        this.overlay = new EditModeOverlay();
        this.overlay.setEnabled(false);
    }
    handleMessage(message) {
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
    setEnabled(enabled) {
        this.state = enabled ? "hovering" : "off";
        this.overlay.setEnabled(enabled);
    }
    getStateResponse() {
        return {
            ok: true,
            state: this.state,
            enabled: this.state !== "off",
        };
    }
}
