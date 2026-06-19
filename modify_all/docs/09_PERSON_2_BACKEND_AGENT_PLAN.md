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

Your ownership:

* Node/Express TypeScript backend
* MongoDB connection and collections
* API contracts
* OpenInfer-compatible client
* LangGraphJS Section Edit Agent
* patch validator
* agent trace logging
* customizations/groups/style memory endpoints

Do not build:

* Chrome extension content script
* lasso/grouping/drag-resize engine
* polished Genie panel UI
* fallback demo page

Before coding, inspect the repo and summarize:

1. Existing backend/shared structure.
2. API endpoints you need to implement.
3. Shared types you need to use.
4. Files you should own.
5. Files you must avoid.

Then implement only the first milestone from `09_PERSON_2_BACKEND_AGENT_PLAN.md`: backend skeleton + health endpoint + MongoDB connection bootstrap + environment example. Do not implement the full agent yet.

Rules:

* Use TypeScript.
* Keep API responses aligned with `03_API_CONTRACTS.md`.
* Keep data models aligned with `04_MONGODB_DATA_MODELS.md`.
* Do not invent frontend behavior.
* Do not implement fake global chatbot behavior.
* At the end, provide changed files, how to test, and the exact git commit message.


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
