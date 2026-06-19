export type UserId = "demo-user";
export type GroupId = string;
export type CustomizationId = string;

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export type TargetSignature = {
  textSignature?: string;
  selectorHint?: string;
  roleHint?: string;
  tagHint?: string;
  bbox: Rect;
};

export type DomElementSummary = {
  localId: string;
  tag: string;
  role?: string;
  text?: string;
  classHint?: string;
  ariaLabel?: string;
  bbox: Rect;
  computedStyle?: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    display?: string;
  };
};

export type AllowedCssProperty =
  | "backgroundColor"
  | "color"
  | "borderRadius"
  | "opacity"
  | "fontSize"
  | "padding"
  | "margin"
  | "boxShadow"
  | "border"
  | "overflow";

export type PatchOperation =
  | {
      type: "style";
      targetId: GroupId;
      css: Partial<Record<AllowedCssProperty, string>>;
    }
  | {
      type: "move";
      targetId: GroupId;
      translateX?: number;
      translateY?: number;
    }
  | {
      type: "resize";
      targetId: GroupId;
      width?: number;
      height?: number;
    }
  | {
      type: "hide";
      targetId: GroupId;
    }
  | {
      type: "compact";
      targetId: GroupId;
    };

export type EditableGroup = {
  groupId: GroupId;
  userId: UserId;
  domain: string;
  path: string;
  label?: string;
  shape: {
    type: "rectangle" | "lasso";
    rect: Rect;
    points?: Point[];
  };
  target: TargetSignature;
  domSummary: DomElementSummary[];
  createdAt: string;
  updatedAt: string;
};

export type SiteCustomization = {
  customizationId: CustomizationId;
  userId: UserId;
  domain: string;
  pathPattern: string;
  groupId: GroupId;
  target: TargetSignature;
  operations: PatchOperation[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SectionEditAgentResult = {
  sectionLabel: string;
  intent: string;
  operations: PatchOperation[];
  critique: {
    safe: boolean;
    reason: string;
  };
  traceId: string;
};

export type GroupUnderstandResult = {
  groupId: GroupId;
  label: string;
  sectionType: string;
  confidence: number;
};

export type AgentTraceStep = {
  name: string;
  status: "success" | "failed" | "skipped";
  inputPreview?: unknown;
  outputPreview?: unknown;
  error?: string;
  startedAt: string;
  finishedAt: string;
};

export const DEMO_USER_ID: UserId = "demo-user";
export const ALLOWED_CSS_PROPERTIES: AllowedCssProperty[] = [
  "backgroundColor",
  "color",
  "borderRadius",
  "opacity",
  "fontSize",
  "padding",
  "margin",
  "boxShadow",
  "border",
  "overflow",
];
