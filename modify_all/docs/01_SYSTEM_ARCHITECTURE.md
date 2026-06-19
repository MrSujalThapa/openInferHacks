# 01 — System Architecture

## Runtime architecture

```text
Chrome Extension
  ├─ Content script: overlay, lasso, grouping, drag/resize, patch application
  ├─ Popup: enter/exit edit mode, clear saved edits, demo controls
  └─ Background/service worker: page messaging and backend calls

Node/Express TypeScript Backend
  ├─ REST API
  ├─ OpenInfer client
  ├─ LangGraphJS Section Edit Agent
  ├─ Patch validator
  └─ MongoDB repositories

MongoDB
  ├─ groups
  ├─ customizations
  ├─ agent_runs
  └─ style_memory
```

## Repo structure

```text
genie/
  extension/
    manifest.json
    src/
      content/
        editMode.ts
        overlay.ts
        lasso.ts
        grouping.ts
        dragResize.ts
        patchEngine.ts
        persistence.ts
      popup/
      shared/
  server/
    src/
      index.ts
      routes/
      agent/
        graph.ts
        openinferClient.ts
        prompts.ts
        validator.ts
      db/
        mongo.ts
        repositories.ts
      types/
  shared/
    contracts.ts
  docs/
```

## Data flow: manual edit

```text
User enters edit mode
  ↓
Lasso creates group in content script
  ↓
User drags/resizes group
  ↓
Patch engine produces operations
  ↓
POST /api/customizations saves operations
  ↓
On refresh, extension GETs customizations and reapplies patches
```

## Data flow: agent edit

```text
Grouped section double-clicked
  ↓
Genie panel opens beside group
  ↓
User submits section-scoped instruction
  ↓
POST /api/agent/section-edit
  ↓
LangGraphJS loads memory + calls OpenInfer nodes
  ↓
Patch validator allows only safe operations
  ↓
Extension previews returned operations
  ↓
User saves customization to MongoDB
```

## Responsibilities by layer

| Layer | Owns | Does not own |
|---|---|---|
| Extension | DOM interaction, overlay UI, applying patches | LLM calls, DB writes directly |
| Backend | Agent workflow, validation, persistence | Direct DOM manipulation |
| MongoDB | Durable state and trace logs | Business logic |
| OpenInfer | Inference for understanding/planning/critique | UI rendering or DB writes |

## MVP safety constraints

- Model never returns executable JavaScript.
- Model returns structured JSON operations only.
- Extension validates target group before applying any patch.
- Backend validates operation types and CSS allowlist.
- All customizations are frontend-only.
