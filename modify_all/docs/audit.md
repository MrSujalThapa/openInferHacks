# Genie Codebase Audit

**Date:** 2026-06-19  
**Scope:** Full repo audit after Person 1 (Step 2B), Person 2 (Step 6A), and Person 3 UI/demo milestones. Read-only inspection; no code changes were made during this audit.

---

## 1. Executive Verdict

* **Can we demo right now?** **partial / effectively no**
  * Static demo page and Agent Trace **preview** work without the backend.
  * **Extension rebuild and server start both fail** because `shared/contracts.ts` is corrupted.
  * Pre-existing `extension/dist/` may still load in Chrome from an earlier build, but the backend cannot run until contracts are restored.
* **Biggest blocker:** `shared/contracts.ts` contains root `package.json` JSON instead of TypeScript types — breaks extension build, server `tsc`, and `tsx` dev server.
* **Most risky area:** **Dual backend stacks** after merge (`server/src/db/*` vs `server/src/mongo.ts` + `server/src/repos/*`) — customizations and agent traces use different Mongo layers.
* **Most complete area:** **Person 3 UI/demo** — Genie panel, Agent Trace viewer, polished fallback demo page (`demo-page/`).

---

## 2. Repo Structure Found

| Area | Path | Role |
|------|------|------|
| Root workspace | `modify_all/package.json` | npm workspaces: `shared`, `server`, `extension` |
| Shared contracts | `shared/contracts.ts` | **BROKEN** — currently overwritten with JSON |
| Shared package | `shared/package.json` | Points to `contracts.ts` |
| Server | `server/src/index.ts` | Express entry, demo static, `/debug` |
| Server DB (Person 2 newer) | `server/src/db/mongo.ts`, `server/src/db/repositories.ts` | Used by `index.ts`, health, customizations routes |
| Server DB (Person 2 older) | `server/src/mongo.ts`, `server/src/repos/index.ts` | Used by agent + `routes/api.ts` |
| Server agent | `server/src/agent/sectionEditAgent.ts`, `validator.ts` | LangGraph Section Edit Agent |
| Server OpenInfer (×2) | `server/src/openinfer/client.ts`, `server/src/agent/openinferClient.ts` | Two different clients/API shapes |
| Server routes | `routes/health.ts`, `customizations.ts`, `openinfer.ts`, `api.ts` | Overlapping `/api/*` surface |
| Extension entry | `extension/manifest.json`, `src/content/index.ts` → `editMode.ts` | MV3 content script |
| Extension popup (active) | `extension/src/popup/popup.ts`, `popup.html` | Built to `dist/popup.*` |
| Extension popup (stale) | `extension/popup.html`, `src/popup/index.ts` | **Not used by build** |
| Extension UI (P3) | `extension/src/content/ui/*` | Genie panel + Agent Trace modules |
| Demo page | `demo-page/index.html`, `demo.css`, `agent-trace.html` | Fallback feed + trace viewer |
| Docs | `docs/*.md` | PRD, plans, API contracts |
| Generated | `extension/dist/`, `server/dist/`, `demo-page/agent-trace.js` | gitignored; dist may be stale |
| Stale scaffold | `app/`, `next.config.ts`, root Next/React deps | Not part of Genie MVP demo path |

**Merge conflict markers:** none found (`<<<<<<<`, `=======`, `>>>>>>>`).

**Duplicate / stale files (likely merge artifacts):**

| File | Status |
|------|--------|
| `server/src/mongo.ts` vs `server/src/db/mongo.ts` | Both exist; only `db/mongo.ts` is wired at startup |
| `server/src/repos/index.ts` vs `server/src/db/repositories.ts` | Both exist; agent uses `repos/`, customizations use `db/` |
| `server/src/openinfer/client.ts` vs `server/src/agent/openinferClient.ts` | Both exist; agent vs `/api/openinfer/test` |
| `extension/popup.html` + `src/popup/index.ts` | Stale Person 1 scaffold; build uses `src/popup/popup.*` |
| Root Next.js app (`app/page.tsx`, etc.) | Misleading; unrelated to extension demo |

---

## 3. Step Completion Matrix

| Step | Owner | Claimed status | Actual status | Evidence | Risk | Next action |
|------|-------|----------------|---------------|----------|------|-------------|
| 1A Scaffold | All | Done | **Complete** | `extension/`, `server/`, `shared/`, `docs/` | Low | None |
| 1B Shared types | All | Done | **Broken** | `shared/contracts.ts` is JSON, not TS | **Critical** | Restore contracts from `docs/02_SHARED_CONTRACTS.md` |
| 1C Dev scripts | All | Done | **Partial** | Root scripts exist; builds fail on contracts | High | Fix contracts, verify `build:extension` + `dev:server` |
| 2A Popup toggle | P1 | Done | **Complete** | `popup.ts`, `GENIE_TOGGLE_EDIT_MODE` | Low | Remove stale `popup/index.ts` later |
| 2B Overlay root | P1 | Done | **Complete** | `editMode.ts` → `Overlay.mount()` | Low | — |
| 2C Hover outlines | P1 | Done | **Complete** | `onMouseMove`, `overlay.showHover()` | Low | Manual test on `/demo` |
| 3A Lasso draw | P1 | Not claimed | **Complete** | `LassoController`, `overlay.drawLasso()` | Low | — |
| 3B Element collection | P1 | Not claimed | **Complete** | `grouping.collectElementsFromLasso()` | Low | — |
| 3C Editable group | P1 | Not claimed | **Complete** | `onLassoComplete`, `selectGroup()` | Low | — |
| 4A Drag | P1 | Not claimed | **Complete** | `dragResize.ts`, pointer handlers | Medium | Test transform on grouped element |
| 4B Resize | P1 | Not claimed | **Complete** | corner handles in `overlay.renderHandles()` | Medium | — |
| 4C Patch engine | P1 | Not claimed | **Complete** | `patchEngine.ts`, `buildOperationsFromManualEdit` | Medium | — |
| 5A Express + health | P2 | Done (≤6A) | **Partial** | `index.ts`, `routes/health.ts`; **server won't start** | High | Fix contracts; confirm `GET /api/health` |
| 5B Mongo connection | P2 | Done | **Partial** | `db/mongo.ts` connected at startup; **legacy `mongo.ts` never connected** | **Critical** | Unify on one mongo module |
| 5C Customization API | P2 | Done | **Partial** | `routes/customizations.ts` + duplicate in `routes/api.ts` | High | Route consolidation |
| 6A OpenInfer client | P2 | Done | **Partial** | `openinfer/client.ts` (mock + chat/completions); separate `openinferClient.ts` for `/v1/responses` | Medium | Pick one client; align env/docs |
| 6B LangGraph agent | P2 | Done | **Complete** | All 8 nodes in `sectionEditAgent.ts` | Medium | Works only after contracts + server fix |
| 6C Validator + traces | P2 | Done | **Partial** | `validator.ts` solid; `saveAgentRun` uses **disconnected** `repos/` | **Critical** | Wire agent repos to `db/mongo.ts` |
| 7A Genie panel on dbl-click | P3/P1 | Done | **Complete** | `onGroupDoubleClick` → `openAgentPanel()` | Low | — |
| 7B Agent preview wired | P1 | Done | **Complete** | `runAgent()` → `POST /api/agent/section-edit` | High | Blocked until server runs |
| 7C Save from extension | P1 | Done | **Partial** | `persistence.saveCustomization()` → `/api/customizations` (strict Mongo via `db/`) | High | Test save with Mongo up |
| 8A Load on page load | P1 | Done | **Complete** | `loadAndApplyCustomizations()` on enter | Medium | Test refresh |
| 8B Target resolve | P1 | Done | **Complete** | `resolveTargetElement()` text+bbox | Medium | May miss after big layout changes |
| 8C MutationObserver reapply | P1 | Done | **Complete** | `setupReapplyObserver()` | Low | — |
| 9A Selection polish | P3 | Done | **Partial** | `content.css` handles/labels; not premium everywhere | Low | Optional polish |
| 9B Genie panel polish | P3 | Done | **Complete** | `geniePanel*.ts`, states, chips | Low | — |
| 9C Agent trace view | P3 | Done | **Complete** | `agentTrace*.ts`, `demo-page/agent-trace.html` | Low | Live mode needs server + Mongo writes |
| 10B Fallback demo page | P3 | Done | **Complete** | `demo-page/index.html`, helper card, trace links | Low | — |
| 10A LinkedIn pass | P3 | Not done | **Missing** | No recorded pass on real LinkedIn | Medium | Run on LinkedIn or accept fallback |
| 10C Final rehearsal | All | Not done | **Missing** | No integration smoke test passing | High | Full demo dry-run after blockers fixed |

---

## 4. Person 1 Audit

**Overall: partial / broken at build time, but feature code is far ahead of claimed Step 2B**

| Item | Status | Evidence |
|------|--------|----------|
| MV3 manifest | **Complete** | `extension/manifest.json` — MV3, content script, popup, service worker |
| Popup → content messaging | **Complete** | `popup.ts` sends `GENIE_TOGGLE_EDIT_MODE`; `editMode.ts` listener |
| Backward-compat messages | **Complete** | `GENIE_SET_EDIT_MODE`, `GENIE_GET_EDIT_MODE` also handled |
| Content script entry | **Complete** | `src/content/index.ts` imports `./editMode` |
| Edit mode toggle | **Complete** | `EditModeController.enter()` / `exit()` |
| Overlay root injected | **Complete** | `Overlay.mount()` on `document.documentElement` |
| Hover outlines | **Complete** | `onMouseMove` + `elementsFromPoint` + `showHover()` |
| Shared contracts import | **Broken** | Imports from `../../../shared/contracts` but file is invalid JSON |
| Broken imports after merge | **Broken** | `npm run build:extension` fails |
| Old overlay overriding integrated mode | **No conflict** | Single `EditModeController` path; stale `popup/index.ts` not built |

**Also implemented (beyond 2B claim):** lasso, grouping, drag, resize, patch engine, agent calls, save/load persistence, MutationObserver (`editMode.ts`, `grouping.ts`, `dragResize.ts`, `patchEngine.ts`, `persistence.ts`).

**Verification command failure:**

```
npm run build:extension
→ ERROR: shared/contracts.ts:2:8 Expected ";" but found ":"
```

**Exact next task for Person 1:** Restore `shared/contracts.ts`, rebuild extension, load `extension/dist`, smoke-test edit mode → lasso → double-click → preview on `http://localhost:4000/demo`. Then verify refresh persistence (Step 8) end-to-end once Person 2 fixes Mongo unification.

---

## 5. Person 2 Audit

**Overall: partial — substantial agent/backend code exists, but merge left two DB stacks and contracts corruption prevents startup**

| Item | Status | Evidence |
|------|--------|----------|
| Express server starts | **Broken** | `npm run dev:server` → tsx fails on `shared/contracts.ts` |
| Config/env loading | **Complete** | `server/src/config.ts` — `PORT`, `MONGODB_URI`, `MONGODB_DB`, OpenInfer vars |
| MongoDB connection | **Partial** | `index.ts` calls `connectMongo()` from **`db/mongo.ts`** only |
| Repositories | **Partial (duplicate)** | `db/repositories.ts` (collections) + `repos/index.ts` (CRUD helpers) |
| Indexes | **Partial** | `ensureIndexes()` in `db/repositories.ts`; also duplicated in legacy `mongo.ts` |
| Customization save/load | **Partial** | Active: `routes/customizations.ts` at `/api/customizations`; duplicate in `routes/api.ts` |
| `GET /api/agent-runs?limit=10` | **Complete (route)** | `routes/api.ts` line 113 |
| Group understand endpoint | **Complete** | `POST /api/groups/understand` in `routes/api.ts`; extension calls it |
| OpenInfer client + env | **Partial (×2)** | Agent uses `openinfer/client.ts` (mock if env missing); test route uses `openinferClient.ts` |
| Mock fallback | **Complete** | `openinfer/client.ts` `mockMode` + deterministic mock responses |
| LangGraph graph | **Complete** | All nodes: LoadStyleMemory → … → LogAgentRun |
| `POST /api/agent/section-edit` | **Complete** | `routes/api.ts` → `runSectionEditAgent()` |
| Patch validation | **Complete** | `validator.ts` — targetId, types, CSS allowlist, unsafe patterns, move/resize bounds |
| Agent runs logged to Mongo | **Broken in practice** | `saveAgentRun()` in `repos/index.ts` uses `getDb()` from **`mongo.ts`**, which is **never connected** by `index.ts` |

**Critical architectural bug:**

```
index.ts  → connectMongo(db/mongo.ts)     ✅ used by /api/customizations
agent     → repos/index.ts → mongo.ts     ❌ db always null → silent no-op saves
agent-runs GET → repos/index.ts           ❌ always returns []
```

**Verification command failures:**

```
npm run build:server / typecheck → shared/contracts.ts TS1005 errors
npm run dev:server → Transform failed on shared/contracts.ts
```

**Exact next task for Person 2:** (1) Restore `shared/contracts.ts`. (2) Consolidate to **one** Mongo module + one repo layer — migrate `sectionEditAgent.ts` and `routes/api.ts` off `mongo.ts`/`repos/index.ts`. (3) Confirm `POST /api/agent/section-edit` writes to `agent_runs` and `GET /api/agent-runs` returns data. (4) Align `.env` location (README says `server/.env`; `.env.example` is at root).

---

## 6. Person 3 Audit

**Overall: complete for claimed UI/demo milestones; depends on backend for live trace/persistence**

| Item | Status | Evidence |
|------|--------|----------|
| Contextual Genie panel | **Complete** | `geniePanel.ts`, `geniePanelView.ts`, `genie-panel.css` |
| Panel only after group dbl-click | **Complete** | `overlay.ts` dblclick → `openAgentPanel()`; not global |
| Quick actions wired | **Complete** | Chips call `onQuickAction` → immediate `runAgent()` |
| Preview/save/loading/error states | **Complete** | `setLoading`, `showResult`, `showSaved`, `showError` |
| Selected group polish | **Partial/Complete** | `content.css` — box, handles, label, size tag |
| Fallback demo page | **Complete** | `demo-page/index.html`, `demo.css`, helper card, 6 targets |
| Demo page served | **Complete** | `index.ts` serves `/demo` static |
| Agent Trace viewer | **Complete** | `agentTrace*.ts`, `demo-page/agent-trace.html` |
| Trace reads live API | **Complete (with fallback)** | `fetchLatestAgentRun()` → `GET /api/agent-runs?limit=1`; mock if offline |
| Popup trace link | **Complete** | `popup.html` → `http://localhost:4000/demo/agent-trace.html` |
| Static preview works offline | **Complete** | `agent-trace-preview.html`, `genie-panel-preview.html` |

**Exact next task for Person 3:** Step **10C** — after integration fixes, run full demo script once, note friction, fix presentation-only issues. Do not touch backend or extension engine files.

---

## 7. End-to-End Flow Audit

| Step | Status | Evidence | Manual test |
|------|--------|----------|-------------|
| 1. Popup toggles edit mode | **Works** (if dist loaded) | `popup.ts` ↔ `editMode.ts` | Extension popup on `/demo` |
| 2. Content script enters edit mode | **Works** | `enter()` adds `genie-editing`, mounts overlay | Blue crosshair overlay appears |
| 3. Hover outlines | **Works** | `onMouseMove`, `showHover` | Move mouse over cards |
| 4. Lasso section | **Works** | `LassoController`, `onLassoComplete` | Draw lasso on Today's News |
| 5. Group object created | **Works** | `EditableGroup` built in `onLassoComplete` | Selection box + label |
| 6. Group understand labels section | **Partial** | `POST /api/groups/understand` | **Blocked until server runs**; falls back to text slice |
| 7. Open Genie panel | **Works** | Double-click selection box | Panel beside group |
| 8. Panel sends instruction | **Partial** | `runAgent()` → `/api/agent/section-edit` | **Blocked until server runs** |
| 9. Backend runs LangGraph agent | **Partial** | `sectionEditAgent.ts` | Mock OpenInfer works without keys |
| 10. Patch validated | **Works** (server-side) | `validator.ts` | Unit-style via agent call |
| 11. Patch returns to extension | **Partial** | `applyOperations()` | Needs server |
| 12. Extension applies patch | **Works** | `patchEngine.ts` | Preview visible on group |
| 13. User saves customization | **Partial** | `saveCustomization()` → `/api/customizations` | Needs Mongo via **`db/mongo`**; 503 if down |
| 14. Persists in MongoDB | **Partial** | `customizationsRouter` | **Agent runs do NOT persist** (wrong repo layer) |
| 15. Refresh reapplies | **Partial** | `loadAndApplyCustomizations()` + `resolveTargetElement()` | Needs prior successful save |
| 16. Agent run in trace viewer | **Partial** | `agent-trace.html` | Live only if `agent_runs` populated; mock otherwise |

---

## 8. MongoDB Local Setup

**Env vars used by code (`server/src/config.ts`, legacy `mongo.ts`):**

| Key | Required | Default / notes |
|-----|----------|-----------------|
| `MONGODB_URI` | Optional but needed for persistence | e.g. `mongodb://localhost:27017/genie_mvp` |
| `MONGODB_DB` | Optional | `genie_mvp` |
| `PORT` | Optional | `4000` |
| `OPENINFER_BASE_URL` | Optional | Mock agent if empty |
| `OPENINFER_API_KEY` | Optional | Mock agent if empty |
| `OPENINFER_MODEL` | Optional | `@oi/beta` |
| `CORS_ORIGIN` | Optional | `http://localhost:3000` |

**`.env.example` (root):**

```
MONGODB_URI=mongodb://localhost:27017/genie_mvp
OPENINFER_BASE_URL=
OPENINFER_API_KEY=
OPENINFER_MODEL=
PORT=4000
```

**Note:** README says copy to `server/.env`, but example is at repo root. `dotenv/config` loads from **process cwd** (likely `server/` when using workspace script). Align file location before demo.

**Local Docker MongoDB (no compose file in repo):**

```powershell
docker run -d --name genie-mongo -p 27017:27017 mongo:7
```

**Suggested local `.env` (server/.env or root, depending on cwd):**

```
MONGODB_URI=mongodb://localhost:27017/genie_mvp
MONGODB_DB=genie_mvp
PORT=4000
OPENINFER_BASE_URL=
OPENINFER_API_KEY=
OPENINFER_MODEL=
```

**Confirm container running:**

```powershell
docker ps --filter name=genie-mongo
# or
docker exec genie-mongo mongosh --eval "db.adminCommand('ping')"
```

**Confirm server connected (after contracts fix):**

```powershell
curl http://localhost:4000/api/health
# Expected: {"ok":true,"mongo":"connected"}  (db/mongo path)
```

**Write/read smoke test:**

```powershell
# Save customization (after server + Mongo up)
curl -X POST http://localhost:4000/api/customizations -H "Content-Type: application/json" -d "{\"domain\":\"localhost\",\"pathPattern\":\"/demo\",\"groupId\":\"group_test\",\"target\":{\"bbox\":{\"x\":0,\"y\":0,\"width\":100,\"height\":100}},\"operations\":[],\"enabled\":true}"

# Read back
curl "http://localhost:4000/api/customizations?domain=localhost&path=/demo"

# Agent run (after fix) then trace
curl "http://localhost:4000/api/agent-runs?limit=1"
```

**Expected collections after use:** `groups`, `customizations`, `agent_runs`, `style_memory` (per `docs/04_MONGODB_DATA_MODELS.md` and `db/repositories.ts`).

**Teammate “spun a local one for testing” — what it means:**

* **Local Docker MongoDB is enough for the hackathon demo** — matches `MONGODB_URI=mongodb://localhost:27017/genie_mvp`.
* **Atlas is optional** — code only needs a URI; no Atlas-specific logic.
* **Production hosting** can run MongoDB in a container on the same host or use a managed DB; app is URI-driven.
* **For hackathon reliability:** use local Docker on the demo machine, pin the URI in `.env`, start Mongo before the server, and verify `/api/health` shows `connected` before judging.

---

## 9. Critical Blockers

1. **`shared/contracts.ts` corrupted** — nothing builds or starts.
2. **Dual MongoDB layers** — customizations may save via `db/mongo`, but agent traces never persist via `repos/` + `mongo.ts`.
3. **Server cannot start** — blocks agent, save, live trace, demo page at `:4000/demo`.
4. **Extension cannot rebuild** — must rely on stale `extension/dist/` until contracts fixed.
5. **Duplicate backend routes/clients** — `/api/customizations`, `/api/health`, two OpenInfer clients increase integration risk during demo prep.

---

## 10. Safe Next Prompts

**Person 1:**

> Restore `shared/contracts.ts` from `docs/02_SHARED_CONTRACTS.md`, run `npm run build:extension`, reload unpacked `extension/dist`, and smoke-test edit mode → lasso → double-click → preview on `http://localhost:4000/demo`. Do not add new features until build passes.

**Person 2:**

> Fix `shared/contracts.ts`, then consolidate Mongo to a single module (`db/mongo.ts` + one repo file). Wire `sectionEditAgent.ts`, `saveAgentRun`, and `routes/api.ts` to that layer. Verify `POST /api/agent/section-edit` writes to `agent_runs` and `GET /api/agent-runs?limit=1` returns it. Do not touch extension UI.

**Person 3:**

> After Person 2 confirms server + trace API work, run Step 10C final demo rehearsal using the fallback page and Agent Trace live view. Fix presentation-only issues (copy, helper placement, popup links). Do not modify backend or extension engine.

**Final integration task:**

> One person runs: restore contracts → start Docker Mongo → start server → rebuild extension → full demo script (edit mode → lasso news sidebar → Genie dark mode → save → refresh → Agent Trace shows live run). Document any remaining failures.

---

## 11. Do-Not-Touch List

| Person | Avoid |
|--------|-------|
| **Person 1** | `server/src/*`, `extension/src/content/ui/*`, `demo-page/*`, `shared/contracts.ts` (coordinate if types needed) |
| **Person 2** | `extension/src/content/*` (except shared types), `demo-page/*`, `extension/src/content/ui/*` |
| **Person 3** | `extension/src/content/editMode.ts`, `overlay.ts`, `grouping.ts`, `dragResize.ts`, `patchEngine.ts`, `persistence.ts`, all `server/src/*` |
| **Everyone** | Do not add a third Mongo/OpenInfer implementation; fix/consolidate existing ones |

---

## 12. Final Recommendation

**Stop feature work.** The repo has substantial integrated code (Person 1 is well past Step 2B; Person 2 is near Step 6C; Person 3 demo UI is ready), but **a merge accident corrupted the shared contracts file** and **left two parallel backend persistence paths**.

Before continuing:

1. **Restore `shared/contracts.ts`** (highest priority — unblocks all builds).
2. **Unify MongoDB access** so customizations and `agent_runs` use the same connection.
3. Run **`npm run build:extension`**, **`npm run dev:server`**, and a **full 3-minute demo dry-run** on `http://localhost:4000/demo`.
4. Only then proceed with Step **10A/10C** polish and LinkedIn fallback narrative.

Until step 1 is done, demo capability is **partial at best** (static demo page + possibly stale extension dist; no reliable backend or trace persistence).
