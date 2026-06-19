# 06 — OpenInfer + LangGraph Agent Spec

Owner: Person 2.

## Agent name

**Section Edit Agent**

## Product rule

The agent only runs when a grouped section is double-clicked. It must never edit the whole page.

## OpenInfer role

OpenInfer is the central inference layer. Every model reasoning step goes through the OpenInfer client.

Required env vars:

```bash
OPENINFER_BASE_URL=
OPENINFER_API_KEY=
OPENINFER_MODEL=
```

Implement an OpenAI-compatible chat wrapper if the endpoint supports it:

```ts
await openinfer.chat({
  model: process.env.OPENINFER_MODEL,
  messages,
  response_format: { type: "json_object" }
});
```

## LangGraphJS state

```ts
type SectionEditState = {
  userId: "demo-user";
  domain: string;
  path: string;
  group: EditableGroup;
  instruction: string;
  styleMemory: string[];
  sectionUnderstanding?: {
    label: string;
    sectionType: string;
    confidence: number;
  };
  intent?: string;
  plannedOperations?: PatchOperation[];
  validatedOperations?: PatchOperation[];
  critique?: {
    safe: boolean;
    reason: string;
  };
  trace: AgentTraceStep[];
};
```

## Graph nodes

```text
START
  ↓
LoadStyleMemory
  ↓
OpenInferUnderstandSection
  ↓
OpenInferInterpretIntent
  ↓
OpenInferPlanPatch
  ↓
ValidatePatch
  ↓
OpenInferCritiquePatch
  ↓
RepairOrFinalize
  ↓
LogAgentRun
  ↓
END
```

## Node responsibilities

### `LoadStyleMemory`

- Reads latest `style_memory` docs from MongoDB.
- Adds memory to state.

### `OpenInferUnderstandSection`

Input: group label, text signature, DOM summary, bbox.

Output:

```json
{
  "label": "News Sidebar",
  "sectionType": "right_sidebar",
  "confidence": 0.9
}
```

### `OpenInferInterpretIntent`

Input: user instruction + section understanding + style memory.

Output:

```json
{
  "intent": "make the selected news sidebar compact, darker, and less distracting"
}
```

### `OpenInferPlanPatch`

Returns only structured patch operations. No JavaScript.

Allowed operation types:

- `style`
- `move`
- `resize`
- `hide`
- `compact`

### `ValidatePatch`

Deterministic TypeScript validator.

Reject if:

- missing targetId;
- targetId does not equal selected group ID;
- operation type is not allowed;
- CSS property is not allowlisted;
- move/resize values are extreme;
- output tries to include JavaScript, HTML, URLs, or external requests.

### `OpenInferCritiquePatch`

Asks OpenInfer to critique whether the validated patch satisfies the user instruction while staying group-scoped.

Output:

```json
{
  "safe": true,
  "reason": "Patch only affects the selected group and uses allowed CSS."
}
```

### `RepairOrFinalize`

- If critique is safe, return operations.
- If unsafe, remove risky operations and return safe subset.

### `LogAgentRun`

Saves full trace to MongoDB `agent_runs`.

## Prompting rules

System prompt must include:

- You edit only the selected group.
- Never output JavaScript.
- Never affect the whole website.
- Return JSON only.
- Use only allowed operations.

## API response

Return:

```ts
type SectionEditAgentResult = {
  sectionLabel: string;
  intent: string;
  operations: PatchOperation[];
  critique: {
    safe: boolean;
    reason: string;
  };
  traceId: string;
};
```

## Demo proof

Show latest `agent_runs` doc to prove:

- OpenInfer was called multiple times;
- memory was retrieved;
- patch was validated;
- trace was persisted.
