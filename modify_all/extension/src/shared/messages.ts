export type GenieEditModeState = "off" | "hovering";

export type GenieRuntimeMessage =
  | {
      type: "GENIE_SET_EDIT_MODE";
      enabled: boolean;
    }
  | {
      type: "GENIE_GET_EDIT_MODE";
    };

export type GenieRuntimeResponse =
  | {
      ok: true;
      state: GenieEditModeState;
      enabled: boolean;
    }
  | {
      ok: false;
      error: string;
    };
