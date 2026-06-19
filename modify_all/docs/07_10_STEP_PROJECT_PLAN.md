# 07 — 10-Step Project Plan

Rule: commit at every first-layer substep. Merge at the end of every numbered step.

Branch base: `main`.

Integration branch: `integration`.

Member branches:

- `feature/extension-editor`
- `feature/backend-agent`
- `feature/ui-demo`

## Step 1 — Scaffold and shared contracts

### 1A — Repo skeleton

- Create `extension/`, `server/`, `shared/`, `docs/`.
- Add basic README and env examples.
- Commit: `step1A scaffold repo`

### 1B — Shared types

- Add `shared/contracts.ts` from `02_SHARED_CONTRACTS.md`.
- Import shared types in extension/server.
- Commit: `step1B add shared contracts`

### 1C — Run scripts

- Add extension build script.
- Add server dev script.
- Confirm both start.
- Commit: `step1C add dev scripts`

Merge Step 1 into `integration`, then `main`.

## Step 2 — Extension edit mode shell

### 2A — Manifest and popup

- Manifest V3.
- Popup button: Enter/Exit Edit Mode.
- Commit: `step2A extension popup toggle`

### 2B — Content script injection

- Content script listens for edit mode messages.
- Inject overlay root.
- Commit: `step2B content script overlay root`

### 2C — Hover outlines

- Highlight best visible element under cursor.
- Commit: `step2C hover outlines`

Merge Step 2.

## Step 3 — Lasso and grouping

### 3A — Draw freeform lasso

- Pointer path captured and rendered.
- Commit: `step3A lasso drawing`

### 3B — Collect elements from lasso

- Point-in-polygon sampling.
- `elementsFromPoint` collection.
- Commit: `step3B lasso element collection`

### 3C — Create editable group

- Build group metadata and bounding box.
- Render selected group outline.
- Commit: `step3C editable group created`

Merge Step 3.

## Step 4 — Drag, resize, and local patch engine

### 4A — Drag group

- Drag selected group using transform.
- Commit: `step4A drag group`

### 4B — Resize handles

- Corner handles update width/height.
- Commit: `step4B resize handles`

### 4C — Patch serialization

- Convert manual edits to `PatchOperation[]`.
- Apply/revert preview locally.
- Commit: `step4C patch engine`

Merge Step 4.

## Step 5 — Backend and MongoDB

### 5A — Express server

- `GET /api/health`.
- CORS for extension dev.
- Commit: `step5A express server`

### 5B — MongoDB connection

- `mongo.ts`, repositories, env config.
- Commit: `step5B mongodb connection`

### 5C — Customization endpoints

- `POST /api/customizations`.
- `GET /api/customizations`.
- Commit: `step5C customization api`

Merge Step 5.

## Step 6 — OpenInfer + LangGraph agent

### 6A — OpenInfer client

- Env-based model client.
- Test call endpoint/log.
- Commit: `step6A openinfer client`

### 6B — LangGraphJS workflow

- Implement Section Edit Agent nodes.
- Commit: `step6B langgraph section edit agent`

### 6C — Patch validator and trace logging

- Validate operations.
- Save `agent_runs`.
- Commit: `step6C patch validator and agent traces`

Merge Step 6.

## Step 7 — Extension/backend integration

### 7A — Genie panel opens on double-click

- Panel appears only beside selected group.
- Commit: `step7A contextual genie panel`

### 7B — Agent request/response wired

- Send group + instruction to backend.
- Preview returned patch.
- Commit: `step7B agent patch preview`

### 7C — Save from extension

- Save group operations to MongoDB.
- Commit: `step7C save customization from extension`

Merge Step 7.

## Step 8 — Reload persistence

### 8A — Load customizations on page load

- Fetch by domain/path.
- Commit: `step8A load saved customizations`

### 8B — Resolve target on reload

- Text signature + bbox fallback.
- Commit: `step8B resolve saved targets`

### 8C — Reapply after rerender

- Basic `MutationObserver` reapply.
- Commit: `step8C reapply after rerender`

Merge Step 8.

## Step 9 — UI polish and demo proof

### 9A — Premium selection visuals

- Figma-style outlines, handles, labels.
- Commit: `step9A polish selection visuals`

### 9B — Genie panel polish

- Quick action chips, loading states, save/cancel.
- Commit: `step9B polish genie panel`

### 9C — Debug trace view

- Simple page/panel showing latest agent run.
- Commit: `step9C agent trace debug view`

Merge Step 9.

## Step 10 — Demo hardening

### 10A — LinkedIn demo pass

- Test on LinkedIn or LinkedIn-like fallback page.
- Commit: `step10A linkedin demo pass`

### 10B — Fallback demo page

- Build stable local LinkedIn-style page.
- Commit: `step10B fallback demo page`

### 10C — Final rehearsal and fixes

- Fix obvious bugs only.
- Commit: `step10C final demo fixes`

Merge Step 10 into `main`.
