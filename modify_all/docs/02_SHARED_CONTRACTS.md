# 02 — Shared Contracts

This file defines shared TypeScript types used by extension and backend. Keep this as the source of truth.

## Core IDs

```ts
export type UserId = "demo-user";
export type GroupId = string;
export type CustomizationId = string;
```

## Geometry

```ts
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
```

## Group

```ts
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
```

## Target signature

Used to find the same section after refresh.

```ts
export type TargetSignature = {
  textSignature?: string;
  selectorHint?: string;
  roleHint?: string;
  tagHint?: string;
  bbox: Rect;
};
```

## DOM summary

```ts
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
```

## Patch operations

```ts
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
```

## CSS allowlist

```ts
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
```

## Customization

```ts
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
```

## Agent output

```ts
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
```
