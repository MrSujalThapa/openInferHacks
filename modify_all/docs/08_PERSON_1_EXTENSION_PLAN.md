# 08 — Person 1 Plan: Extension Interaction Engine

Prompt 0:
You are Person 1 for the Genie project.

First, read these docs:

* `docs/00_PROJECT_DETAILS_PRD.md`
* `docs/01_SYSTEM_ARCHITECTURE.md`
* `docs/02_SHARED_CONTRACTS.md`
* `docs/05_EXTENSION_EDITOR_SPEC.md`
* `docs/07_10_STEP_PROJECT_PLAN.md`
* `docs/08_PERSON_1_EXTENSION_PLAN.md`
* `docs/11_GIT_WORKFLOW_AND_INTEGRATION.md`

Your ownership:

* Chrome extension editor engine
* content script
* edit mode overlay
* hover/click selection
* freeform lasso
* grouping engine
* drag/resize engine
* patch preview/apply/reapply
* persistence client integration using shared API contracts

Do not build:

* backend routes
* MongoDB logic
* OpenInfer client
* LangGraph agent internals
* final polished Genie panel UI
* fallback demo page

Before coding, inspect the repo and summarize:

1. Existing folder structure.
2. Files you should own.
3. Files you must avoid.
4. Any missing shared contracts/types you need.

Then implement only the first milestone from `08_PERSON_1_EXTENSION_PLAN.md`: extension editor skeleton + edit mode toggle + content script wiring. Keep it minimal and integration-friendly.

Rules:

* Use TypeScript.
* Reuse shared types from `shared/` if they exist.
* If shared types are missing, create only minimal types needed and place them where the docs specify.
* Do not hardcode LinkedIn selectors.
* Do not implement lasso, drag, resize, or agent UI yet.
* At the end, provide changed files, how to test, and the exact git commit message.


## Ownership

You own the Chrome extension editor engine. Avoid backend and agent code except API calls.

Primary directories:

```text
extension/src/content/
extension/src/shared/
extension/manifest.json
```

Do not edit:

```text
server/src/agent/
server/src/db/
```

## Deliverables

- Edit mode toggle.
- Hover outlines.
- Freeform lasso.
- Group creation.
- Figma-style bounding box.
- Drag and resize.
- Patch application and reapply.
- Calls to backend for agent/save/load.

## Step tasks

### Step 1

- Confirm shared contracts import into extension.
- Commit after import works.

### Step 2

- Implement manifest, popup, content script messaging.
- Inject overlay root.
- Add hover outlines.

### Step 3

- Build lasso drawing.
- Sample elements inside lasso.
- Create `EditableGroup` object.

### Step 4

- Implement drag.
- Implement resize handles.
- Serialize manual edit operations.

### Step 7

- Open Genie panel only on group double-click.
- Send `POST /api/agent/section-edit`.
- Apply returned patch as preview.
- Save operations through `POST /api/customizations`.

### Step 8

- Load saved customizations on page load.
- Resolve target from text signature/bbox.
- Reapply patches after DOM rerenders.

### Step 9–10

- Polish interactions.
- Test on LinkedIn and fallback page.

## Interface contracts you must obey

Agent request:

```ts
{
  domain: string;
  path: string;
  group: EditableGroup;
  instruction: string;
}
```

Agent response:

```ts
{
  sectionLabel: string;
  intent: string;
  operations: PatchOperation[];
  critique: { safe: boolean; reason: string };
  traceId: string;
}
```

## Done checklist

- Lasso feels smooth.
- Group bounding box looks polished.
- Drag/resize is reliable enough for demo.
- Genie never opens without double-clicking a group.
- Refresh persistence works at least on demo page and LinkedIn target.
