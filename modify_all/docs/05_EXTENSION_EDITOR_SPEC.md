# 05 — Extension Editor Spec

Owner: Person 1, with UI support from Person 3.

## Goal

Make any desktop webpage feel like a Figma-style sandbox without changing the website backend.

## Edit mode states

```ts
type EditModeState =
  | "off"
  | "hovering"
  | "selecting"
  | "group-selected"
  | "dragging"
  | "resizing"
  | "agent-open";
```

## Core interactions

### Enter edit mode

- Extension popup button sends `GENIE_ENTER_EDIT_MODE` to content script.
- Content script injects overlay root.
- Body gets class `genie-editing`.

### Hover outline

- Track `mousemove`.
- Use `document.elementsFromPoint(x, y)`.
- Pick best visible page element.
- Draw blue outline around candidate.

### Freeform lasso

- Hold mouse/pointer and drag on overlay.
- Draw SVG path.
- On release, close polygon.
- Sample points inside polygon.
- Collect elements from `document.elementsFromPoint`.
- Filter extension UI, hidden elements, tiny elements, scripts/styles.
- Create group from best common parent or selected elements.

### Grouping heuristic

Prefer containers that:

- are visible;
- have meaningful text;
- contain most sampled elements;
- have area above threshold;
- are `article`, `aside`, `section`, `main`, `nav`, `div`, or `form`;
- are not the full page body unless no better candidate exists.

### Selected group UI

Show:

- blue bounding box;
- corner handles;
- size label, e.g. `312 × 540`;
- small tag label, e.g. `News Sidebar`;
- double-click target area.

### Drag

- Dragging selected group updates transform preview.
- Store as `move` operation.

### Resize

- Corner handles update width/height preview.
- Store as `resize` operation.
- Apply `overflow: hidden` if needed.

### Agent invocation

- Only open Genie panel on double-click of a selected group.
- If no group is selected, do nothing.
- Clicking outside panel closes it.

## Patch application rules

Apply operations only to the resolved target element or wrapper.

For MVP, patch the main target element directly:

```ts
element.style.transform = `translate(${x}px, ${y}px)`;
element.style.width = `${width}px`;
element.style.height = `${height}px`;
element.style.backgroundColor = value;
```

For groups with multiple elements, wrap visually using overlay bounding box but apply style to best common parent.

## Persistence on page load

1. Get current `domain` and `path`.
2. Call `GET /api/customizations`.
3. For each customization, resolve target:
   - selector hint;
   - text signature;
   - region/bbox similarity;
   - fallback visible candidate ranking.
4. Apply operations.
5. Use `MutationObserver` to reapply after rerenders.

## Required content script modules

- `editMode.ts` — state machine and message handlers.
- `overlay.ts` — SVG/canvas overlay and selection UI.
- `lasso.ts` — path collection, point-in-polygon, element sampling.
- `grouping.ts` — element filtering and group metadata.
- `dragResize.ts` — Figma-like handles.
- `patchEngine.ts` — apply/revert/serialize operations.
- `persistence.ts` — backend calls and reload reapply.

## Acceptance checklist

- Can enter/exit edit mode.
- Can lasso a section.
- Can see a group bounding box.
- Can drag a group.
- Can resize a group.
- Double-click opens Genie beside group.
- Patch from backend previews correctly.
- Saved patch reapplies after refresh.
