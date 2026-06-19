# 11 — Git Workflow and Integration

## Goal

Let 3 people move fast without duplicate code, hidden work, or messy merge conflicts.

## Branches

```text
main                  stable demo branch
integration           step-level merge branch
feature/extension-editor
feature/backend-agent
feature/ui-demo
```

## Directory ownership

| Area | Owner | Others should avoid |
|---|---|---|
| `extension/src/content/core` | Person 1 | Person 2/3 |
| `server/src` | Person 2 | Person 1/3 |
| `extension/src/content/ui` | Person 3 | Person 1/2 except integration |
| `shared/contracts.ts` | Shared, but Person 2 coordinates | Everyone edits carefully |
| package/dependency files | Assigned per app | Avoid random edits |

## Commit rule

Commit at every first-layer substep.

Format:

```text
step<step><substep> <short description>
```

Examples:

```text
step3A lasso drawing
step6B langgraph section edit agent
step9B polish genie panel
```

## Merge rule

At the end of every numbered step:

1. Each person pushes their branch.
2. Merge relevant branches into `integration`.
3. Run quick smoke test.
4. Merge `integration` into `main`.
5. Everyone pulls latest `main` before continuing.

## Conflict prevention

- Do not duplicate shared types in multiple places.
- Do not rename shared fields without telling team.
- Keep extension/backend boundary through APIs only.
- Person 2 owns backend response shape.
- Person 1 owns content script consumption of response shape.
- Person 3 owns visual polish around existing hooks/classes.

## Integration checkpoints

### Checkpoint A — after Step 4

Extension works locally without backend.

### Checkpoint B — after Step 6

Backend agent works with a mock request.

### Checkpoint C — after Step 7

Extension calls backend and previews a patch.

### Checkpoint D — after Step 8

Refresh persistence works.

### Checkpoint E — after Step 10

Demo is frozen. Only critical fixes allowed.

## Emergency fallback

If real agent is slow:

- backend returns a deterministic patch for common quick actions;
- still logs OpenInfer attempt if possible;
- demo focuses on lasso, group, drag/resize, save, reload.

If real LinkedIn is unstable:

- use fallback LinkedIn-style page;
- say the extension uses generic DOM heuristics and the demo page gives stable network conditions.
