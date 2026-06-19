# Genie MVP

Figma-style edit mode for live websites — Chrome extension + TypeScript backend powered by OpenInfer.

## Structure

```
extension/   Chrome Manifest V3 extension
server/      Express + MongoDB + LangGraphJS agent
shared/      Shared TypeScript contracts
demo-page/   LinkedIn-style fallback demo page
docs/        PRD and specs
```

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `server/.env` and set:

- `MONGODB_URI` — MongoDB connection (optional; server runs without it)
- `OPENINFER_BASE_URL`, `OPENINFER_API_KEY`, `OPENINFER_MODEL` — OpenInfer (optional; mock mode when unset)

### 3. Start backend

```bash
npm run dev:server
```

- API: http://localhost:4000/api/health
- Demo page: http://localhost:4000/demo
- Agent traces: http://localhost:4000/debug

### 4. Build & load extension

```bash
npm run build:extension
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `extension/dist`

### 5. Demo flow

1. Open http://localhost:4000/demo (or LinkedIn)
2. Click the Genie extension → **Enter Edit Mode**
3. Lasso a section (e.g. LinkedIn News sidebar)
4. **Double-click** the selection to open Genie
5. Use quick actions or type a prompt → **Preview** → **Save**
6. Refresh the page — customizations reapply via textSignature + bbox

## Product rules

- No auth (`userId = "demo-user"`)
- Agent appears only on double-click of a selected group
- Manual lasso, drag, resize work without AI
- Agent returns structured `PatchOperation` JSON only — no arbitrary JS

## API

See [docs/03_API_CONTRACTS.md](docs/03_API_CONTRACTS.md).
