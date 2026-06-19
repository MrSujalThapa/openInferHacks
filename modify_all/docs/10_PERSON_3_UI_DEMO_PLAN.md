# 10 — Person 3 Plan: UI/UX, Demo Polish, Fallback Page

Prompt 0:
You are Person 3 for the Genie project.

First, read these docs:

* `docs/00_PROJECT_DETAILS_PRD.md`
* `docs/01_SYSTEM_ARCHITECTURE.md`
* `docs/02_SHARED_CONTRACTS.md`
* `docs/05_EXTENSION_EDITOR_SPEC.md`
* `docs/07_10_STEP_PROJECT_PLAN.md`
* `docs/10_PERSON_3_UI_DEMO_PLAN.md`
* `docs/11_GIT_WORKFLOW_AND_INTEGRATION.md`
* `docs/12_DEMO_SCRIPT_AND_ACCEPTANCE.md`

Your ownership:

* contextual Genie panel UI
* quick action chips
* selected group visual polish
* loading/success/error states
* lightweight agent trace/debug viewer
* fallback LinkedIn-style demo page
* final demo flow/pitch support

Do not build:

* lasso selection engine
* grouping engine
* drag/resize engine internals
* backend routes
* MongoDB schema
* OpenInfer client
* LangGraph internals

Before coding, inspect the repo and summarize:

1. Existing UI/demo structure.
2. Components you should own.
3. Components you need from Person 1.
4. API/mock data you need from Person 2.
5. Files you must avoid.

Then implement only the first milestone from `10_PERSON_3_UI_DEMO_PLAN.md`: Genie panel shell + scoped prompt input + quick action chip layout using mock props. The panel must be contextual and anchored beside a selected group, not a global sidebar.

Rules:

* Use TypeScript/React if the scaffold supports it.
* The panel should only appear when a grouped section is double-clicked.
* The placeholder should be: `Tell Genie what to change in this group`.
* Do not create duplicate selection, lasso, drag, resize, backend, or agent logic.
* At the end, provide changed files, how to test, and the exact git commit message.
________ ENd of prompt 0


## Ownership

You own the user-facing polish, Genie panel design, demo safety, and presentation assets.

Primary directories:

```text
extension/src/content/ui/
extension/src/popup/
demo-page/
docs/demo-assets/
```

Avoid changing backend logic or core lasso math unless pairing.

## Deliverables

- Premium visual style.
- Contextual Genie panel.
- Quick action chips.
- Loading/success/error states.
- Fallback LinkedIn-style demo page.
- Demo script.
- Debug trace display.

## UI principles

- Looks like Figma selection + modern assistant card.
- Agent is hidden by default.
- Agent appears only beside selected group after double-click.
- Copy says “Edit this section”, not “Ask anything”.
- Quick actions are precise.

## Genie panel content

Title:

```text
Genie
```

Subtitle examples:

```text
Editing: News Sidebar
```

Placeholder:

```text
Tell Genie what to change in this group
```

Quick actions:

- Dark mode
- Compact
- Hide
- Move lower
- Match my style

Buttons:

- Preview
- Save
- Cancel

States:

- Thinking with OpenInfer...
- Preview ready
- Saved to MongoDB
- Could not apply patch

## Fallback demo page

Build a stable LinkedIn-style page with:

- left profile sidebar;
- center post composer;
- main feed cards;
- right news sidebar;
- top nav.

Use this if real LinkedIn is unstable or login blocks the demo.

## Debug trace view

Create a small route/page/panel showing latest agent run:

- instruction;
- section label;
- graph steps;
- final operations;
- saved timestamp.

This is for judges to see OpenInfer + MongoDB are real.

## Step tasks

### Step 2–4

- Pair with Person 1 on overlay visuals.
- Style bounding boxes, handles, labels.

### Step 7

- Build Genie panel and quick actions.
- Ensure panel closes on click-away/cancel.

### Step 9

- Polish animations and states.
- Build trace/debug UI.

### Step 10

- Build fallback page.
- Rehearse exact demo.
- Prepare 30-second pitch.

## Done checklist

- Demo looks premium even if backend is slow.
- Fallback page is ready.
- Judges can see OpenInfer trace and MongoDB persistence.
- Pitch is practiced and under time.
