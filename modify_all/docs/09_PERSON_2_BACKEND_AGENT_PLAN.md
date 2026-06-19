# 09 — Person 2 Plan: Backend, OpenInfer, Agent, MongoDB

Prompt 0:
You are Person 2 for the Genie project.

First, read these docs:

* `docs/00_PROJECT_DETAILS_PRD.md`
* `docs/01_SYSTEM_ARCHITECTURE.md`
* `docs/02_SHARED_CONTRACTS.md`
* `docs/03_API_CONTRACTS.md`
* `docs/04_MONGODB_DATA_MODELS.md`
* `docs/06_OPENINFER_LANGGRAPH_AGENT_SPEC.md`
* `docs/07_10_STEP_PROJECT_PLAN.md`
* `docs/09_PERSON_2_BACKEND_AGENT_PLAN.md`
* `docs/11_GIT_WORKFLOW_AND_INTEGRATION.md`
* `docs/12_DEMO_SCRIPT_AND_ACCEPTANCE.md`

Your ownership:

* Node/Express TypeScript backend
* MongoDB connection and repository layer
* API routes/contracts
* OpenInfer-compatible inference client
* LangGraphJS Section Edit Agent
* patch validator
* agent trace logging
* groups/customizations/style memory persistence
* backend support for demo/debug endpoints

Do not build:

* Chrome extension content script
* lasso selection engine
* grouping engine internals
* drag/resize engine internals
* polished Genie panel UI
* selected group visual polish
* fallback demo page UI

Before coding, inspect the repo and summarize:

1. Existing backend/server structure.
2. Existing API routes, if any.
3. Existing MongoDB connection/repositories, if any.
4. Existing OpenInfer client, if any.
5. Existing LangGraph/agent files, if any.
6. Shared contracts you need to use.
7. Files you should own.
8. Files you must avoid.
9. Whether milestone 1 already exists partially or fully.

Then implement only the first milestone from `docs/09_PERSON_2_BACKEND_AGENT_PLAN.md`: backend skeleton + health endpoint + MongoDB connection bootstrap + environment example.

Important:

* If the backend skeleton already exists, refine or fix it instead of creating duplicate server files.
* The server should run locally without real MongoDB/OpenInfer if env vars are missing, using safe mock/fallback behavior only where the docs allow.
* Do not implement the full LangGraph agent yet unless milestone 1 explicitly requires it.
* Do not change extension behavior or UI components.

Rules:

* Use TypeScript.
* Keep API responses aligned with `docs/03_API_CONTRACTS.md`.
* Keep data models aligned with `docs/04_MONGODB_DATA_MODELS.md`.
* Reuse shared contracts/types from `docs/02_SHARED_CONTRACTS.md` or existing shared files.
* Do not create a global chatbot endpoint. The agent must remain section-scoped.
* At the end, provide:

  * changed files
  * how to test
  * risks or integration notes
  * exact git commit message


## Ownership

You own the TypeScript backend, MongoDB, OpenInfer client, LangGraphJS agent, and patch validation.

Primary directories:

```text
server/src/
shared/contracts.ts
```

Do not edit extension visuals except minimal API test helpers.

## Deliverables

- Express server.
- MongoDB connection and repositories.
- API contracts from `03_API_CONTRACTS.md`.
- OpenInfer client.
- LangGraphJS Section Edit Agent.
- Patch validator.
- Agent trace logging.
- Style memory seed and retrieval.

## Step tasks

### Step 1

- Create shared contracts with team.
- Ensure backend imports types.

### Step 5

- Implement Express server.
- Connect MongoDB.
- Add repositories for `groups`, `customizations`, `agent_runs`, `style_memory`.
- Add customization save/load endpoints.

### Step 6

- Implement OpenInfer client using env vars.
- Implement LangGraphJS graph:
  - LoadStyleMemory
  - OpenInferUnderstandSection
  - OpenInferInterpretIntent
  - OpenInferPlanPatch
  - ValidatePatch
  - OpenInferCritiquePatch
  - RepairOrFinalize
  - LogAgentRun
- Add `POST /api/agent/section-edit`.

### Step 7

- Pair briefly with Person 1 to confirm request/response shape.
- Fix only contract-level issues.

### Step 9

- Add `GET /api/agent-runs?limit=10` for demo proof.
- Add seed memory endpoint or startup seed.

## Patch validation rules

Reject if:

- targetId is not the selected group ID;
- operation type is not allowlisted;
- CSS property is not allowlisted;
- CSS value contains `url(`, `<script`, `javascript:`, or external references;
- move > 1000 px in either direction;
- width/height outside reasonable range.

## OpenInfer usage requirements

For a good demo, call OpenInfer in at least three graph nodes:

1. Understand section.
2. Interpret instruction with memory.
3. Plan patch.
4. Critique patch, if time allows.

Log each OpenInfer step into `agent_runs.steps`.

## Done checklist

- Server starts with one command.
- MongoDB writes/read works.
- Agent endpoint returns valid patch JSON.
- Bad patches are rejected.
- Latest agent trace can be shown in demo.
