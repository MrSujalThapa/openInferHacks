# 03 — API Contracts

Base URL: `http://localhost:4000`

No auth for MVP. Backend assumes `userId = "demo-user"`.

## GET `/api/health`

Returns server and MongoDB status.

```json
{
  "ok": true,
  "mongo": "connected"
}
```

## POST `/api/groups/understand`

Optional but useful. Labels a newly created group with OpenInfer.

### Request

```json
{
  "domain": "linkedin.com",
  "path": "/feed",
  "group": {
    "groupId": "group_123",
    "shape": { "type": "lasso", "rect": { "x": 100, "y": 100, "width": 300, "height": 400 } },
    "target": { "textSignature": "LinkedIn News", "bbox": { "x": 100, "y": 100, "width": 300, "height": 400 } },
    "domSummary": []
  }
}
```

### Response

```json
{
  "groupId": "group_123",
  "label": "News Sidebar",
  "sectionType": "right_sidebar",
  "confidence": 0.88
}
```

## POST `/api/agent/section-edit`

Runs the LangGraphJS Section Edit Agent. Requires a selected group.

### Request

```json
{
  "domain": "linkedin.com",
  "path": "/feed",
  "group": {
    "groupId": "group_123",
    "label": "News Sidebar",
    "target": { "textSignature": "LinkedIn News", "bbox": { "x": 100, "y": 100, "width": 300, "height": 400 } },
    "domSummary": []
  },
  "instruction": "Make this compact dark mode and less distracting."
}
```

### Response

```json
{
  "sectionLabel": "News Sidebar",
  "intent": "reduce visual prominence while preserving readability",
  "operations": [
    {
      "type": "compact",
      "targetId": "group_123"
    },
    {
      "type": "style",
      "targetId": "group_123",
      "css": {
        "backgroundColor": "#111827",
        "color": "#f9fafb",
        "borderRadius": "16px",
        "opacity": "0.86"
      }
    }
  ],
  "critique": {
    "safe": true,
    "reason": "Operations affect only the selected group and use allowed properties."
  },
  "traceId": "trace_123"
}
```

## POST `/api/customizations`

Saves or updates a customization.

### Request

```json
{
  "domain": "linkedin.com",
  "pathPattern": "/feed",
  "groupId": "group_123",
  "target": { "textSignature": "LinkedIn News", "bbox": { "x": 100, "y": 100, "width": 300, "height": 400 } },
  "operations": [],
  "enabled": true
}
```

### Response

```json
{
  "ok": true,
  "customizationId": "custom_123"
}
```

## GET `/api/customizations?domain=linkedin.com&path=/feed`

Returns enabled customizations for the current page.

```json
{
  "customizations": [
    {
      "customizationId": "custom_123",
      "groupId": "group_123",
      "target": { "textSignature": "LinkedIn News", "bbox": { "x": 100, "y": 100, "width": 300, "height": 400 } },
      "operations": [],
      "enabled": true
    }
  ]
}
```

## GET `/api/style-memory`

Returns style memory for `demo-user`.

```json
{
  "memories": [
    {
      "content": "User prefers compact dark sections with reduced visual clutter."
    }
  ]
}
```

## POST `/api/style-memory`

Adds or updates one concise memory.

```json
{
  "content": "User prefers compact dark sections with reduced visual clutter."
}
```

## GET `/api/agent-runs?limit=10`

Returns latest agent traces for demo/debug UI.
