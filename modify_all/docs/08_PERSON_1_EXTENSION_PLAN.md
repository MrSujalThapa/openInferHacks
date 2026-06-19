# 08 — Person 1 Plan: Extension Interaction Engine

You are Person 1 for the Genie project.

First, read these docs:

* `docs/00_PROJECT_DETAILS_PRD.md`
* `docs/01_SYSTEM_ARCHITECTURE.md`
* `docs/02_SHARED_CONTRACTS.md`
* `docs/05_EXTENSION_EDITOR_SPEC.md`
* `docs/07_10_STEP_PROJECT_PLAN.md`
* `docs/08_PERSON_1_EXTENSION_PLAN.md`
* `docs/11_GIT_WORKFLOW_AND_INTEGRATION.md`
* `docs/12_DEMO_SCRIPT_AND_ACCEPTANCE.md`

Your ownership:

* Chrome extension editor engine
* content script behavior
* edit mode overlay
* hover/click selection
* freeform lasso
* grouping engine
* selected group bounding box integration
* drag/resize engine internals
* patch preview/apply/reapply engine
* extension-side persistence client integration using shared API contracts

Do not build:

* backend routes
* MongoDB schemas/repos
* OpenInfer client
* LangGraph agent internals
* polished Genie panel UI
* fallback demo page
* trace/debug viewer UI

Before coding, inspect the repo and summarize:

1. Existing extension structure.
2. Existing content script/editor files, if any.
3. Existing lasso/grouping/drag/resize/patch files, if any.
4. Files you should own.
5. UI components/events you need from Person 3.
6. API contracts/endpoints you need from Person 2.
7. Files you must avoid.
8. Whether milestone 1 already exists partially or fully.

Then implement only the first milestone from `docs/08_PERSON_1_EXTENSION_PLAN.md`: extension editor skeleton + edit mode toggle + content script wiring.

Important:

* If an extension skeleton already exists, refine or fix it instead of creating duplicate systems.
* The extension should support a clear edit mode state.
* The content script should be wired in a way that later milestones can add hover outlines, lasso, grouping, drag, resize, and patch reapply cleanly.
* Do not hardcode LinkedIn-specific selectors.
* Do not implement future milestones early.

Rules:

* Use TypeScript.
* Reuse shared contracts/types from `docs/02_SHARED_CONTRACTS.md` or existing shared files.
* Keep the implementation modular and integration-friendly.
* Do not duplicate Person 3’s Genie panel UI.
* Do not duplicate Person 2’s backend/agent logic.
* At the end, provide:

  * changed files
  * how to test
  * risks or integration notes
  * exact git commit message


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
