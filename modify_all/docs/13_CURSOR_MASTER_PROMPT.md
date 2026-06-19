# 13 — Cursor Master Prompt

Use this prompt to initialize the project in Cursor.

```text
Build a 7-hour MVP called Genie: a desktop Chrome extension plus TypeScript backend that turns live websites into a Figma-style edit mode.

Product rules:
- No auth. Use userId = "demo-user".
- Desktop web only.
- Agent never appears by default.
- Agent appears only when a grouped section is double-clicked.
- Agent edits only the selected group, not the entire page.
- Manual lasso, drag, and resize must work without AI.
- OpenInfer must power the multi-step agent workflow.
- MongoDB must store groups, customizations, style memory, and agent traces.
- Do not generate or execute arbitrary JavaScript from the model.

Repo structure:
- extension/: Chrome Manifest V3 extension.
- server/: Node/Express TypeScript backend.
- shared/: shared TypeScript contracts.
- docs/: PRD docs.

Extension requirements:
- Popup button toggles edit mode.
- Content script injects overlay.
- Hover outlines visible DOM containers.
- Freeform lasso draws a path and creates an EditableGroup using elementsFromPoint sampling.
- Selected group shows Figma-style blue bounding box, corner resize handles, and size label.
- Group can be dragged and resized.
- Double-clicking selected group opens a contextual Genie panel beside it.
- Genie panel has quick actions: Dark mode, Compact, Hide, Move lower, Match my style.
- Prompt placeholder: "Tell Genie what to change in this group".
- Returned patch operations preview immediately.
- Save writes customization to backend.
- Page reload fetches saved customizations and reapplies them using textSignature + bbox fallback.

Backend requirements:
- Express TypeScript server on port 4000.
- MongoDB connection using MONGODB_URI.
- API endpoints from docs/03_API_CONTRACTS.md.
- OpenInfer client using OPENINFER_BASE_URL, OPENINFER_API_KEY, OPENINFER_MODEL.
- LangGraphJS Section Edit Agent with nodes:
  1. LoadStyleMemory
  2. OpenInferUnderstandSection
  3. OpenInferInterpretIntent
  4. OpenInferPlanPatch
  5. ValidatePatch
  6. OpenInferCritiquePatch
  7. RepairOrFinalize
  8. LogAgentRun
- Agent returns only structured PatchOperation JSON.
- Validator rejects unsafe operations and non-allowlisted CSS.

MongoDB collections:
- groups
- customizations
- agent_runs
- style_memory

Prioritize polish and demo reliability over perfect universal support. Demo should work on LinkedIn if possible and a stable LinkedIn-style fallback page if needed.
```
