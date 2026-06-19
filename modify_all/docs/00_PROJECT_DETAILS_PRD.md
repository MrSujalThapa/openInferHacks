# 00 — Project Details PRD

## Product name

**Genie** — a Figma-style edit mode for live websites.

## One-liner

Genie lets users lasso and group any section of a live webpage, drag/resize/restyle it, and only when they double-click that exact group does a contextual OpenInfer-powered agent appear to make precise frontend-only edits that persist across visits.

## Problem

People use the same websites daily, but cannot personalize their layouts. Important actions are buried, distracting modules are prominent, and most sites offer little or no UI customization.

## MVP user experience

1. User opens a desktop website, preferably LinkedIn for the demo.
2. User clicks the Chrome extension to enter **Edit Mode**.
3. Page shows Figma-style hover outlines.
4. User lassos or clicks page elements to create a grouped section.
5. User can drag/resize the group manually.
6. User double-clicks the grouped section.
7. Genie appears beside that group only.
8. User gives a precise instruction for that section, for example: “Make this compact dark mode.”
9. Agent returns safe structured patch operations.
10. User previews/saves.
11. Refreshing the page reapplies the customization from MongoDB.

## Non-negotiable UX rules

- No global chatbot.
- No agent unless a group exists and the user double-clicks it.
- Agent edits only the selected group, never the full page.
- Manual drag/resize must work without AI.
- Changes are frontend-only and reversible.
- No auth for MVP. Use `demo-user`.
- Desktop web only.

## MVP scope

### Must ship

- Chrome extension edit mode.
- Hover outlines.
- Freeform lasso selection.
- Group bounding box.
- Drag and resize.
- Contextual Genie panel on double-click.
- OpenInfer-powered section edit agent.
- MongoDB persistence for groups, customizations, style memory, and agent traces.
- Reapply saved customizations on refresh.
- Polished LinkedIn demo.

### Should ship

- Quick action chips: Dark mode, Compact, Hide, Move lower, Match my style.
- Simple selector/text-signature fallback on reload.
- Debug panel showing MongoDB agent trace.

### Cut for MVP

- Auth.
- Mobile support.
- Multi-user sync.
- Full universal support guarantee.
- AskJean runtime.
- Runtime MCP architecture.
- Arbitrary JavaScript generation.
- Full selector repair autonomy.

## Success criteria

The demo succeeds if a judge can see:

- A live website becomes editable like a canvas.
- A custom group can be created with lasso.
- The group can be manually moved/resized.
- Genie appears only after double-clicking a group.
- Genie makes a precise group-scoped edit using OpenInfer.
- MongoDB stores and reloads the customization after refresh.
