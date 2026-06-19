import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { connectMongo, isMongoConnected } from "./db/mongo.js";
import { ensureIndexes, seedStyleMemory } from "./db/repositories.js";
import { customizationsRouter } from "./routes/customizations.js";
import { healthRouter } from "./routes/health.js";
import { openInferRouter } from "./routes/openinfer.js";
import { apiRouter } from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Dev/demo-only: allow any origin so the extension works on real sites (LinkedIn, etc.).
app.use(cors({ origin: true }));

app.use(express.json({ limit: "2mb" }));

app.use("/api/health", healthRouter);
app.use("/api/customizations", customizationsRouter);
app.use("/api/openinfer", openInferRouter);

// Person 3 trace viewer depends on routes like:
// GET /api/agent-runs?limit=1
// Keep this after specific API routers so it does not override them.
app.use("/api", apiRouter);

const demoPagePath = path.resolve(__dirname, "../../demo-page");

app.use("/demo", express.static(demoPagePath));

app.get("/demo", (_request, response) => {
  response.sendFile(path.join(demoPagePath, "index.html"));
});

app.get("/debug", (_request, response) => {
  response.send(`<!DOCTYPE html>
<html>
<head>
  <title>Genie Agent Traces</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;background:#0f172a;color:#e2e8f0}
    h1{color:#38bdf8}
    pre{background:#1e293b;padding:1rem;border-radius:8px;overflow:auto;font-size:13px}
    .card{background:#1e293b;border-radius:12px;padding:1rem;margin:1rem 0;border:1px solid #334155}
    .step{font-size:12px;color:#94a3b8;margin:4px 0}
  </style>
</head>
<body>
  <h1>Genie Agent Traces</h1>
  <p>Latest OpenInfer + LangGraph runs from MongoDB</p>
  <div id="runs">Loading...</div>
  <script>
    fetch('/api/agent-runs?limit=5')
      .then((r) => r.json())
      .then((d) => {
        const el = document.getElementById('runs');
        if (!d.runs || !d.runs.length) {
          el.innerHTML = '<p>No runs yet. Double-click a group and use Genie.</p>';
          return;
        }

        el.innerHTML = d.runs.map((r) => \`<div class="card">
          <strong>\${r.instruction}</strong>
          <div class="step">trace: \${r.traceId} · group: \${r.groupId} · \${new Date(r.createdAt).toLocaleString()}</div>
          \${(r.steps || []).map((s) => \`<div class="step">\${s.name}: \${s.status}</div>\`).join('')}
          <pre>\${JSON.stringify(r.finalPatch, null, 2)}</pre>
        </div>\`).join('');
      });
  </script>
</body>
</html>`);
});

app.use((_request, response) => {
  response.status(404).json({ ok: false, error: "Not found" });
});

async function startServer(): Promise<void> {
  const mongoUri = config.mongodbUri;
  const redactedUri = mongoUri ? mongoUri.replace(/\/\/([^@/]+@)?/, "//***@") : "(not set)";

  try {
    await connectMongo(config.mongodbUri, config.mongodbDb);

    if (config.mongodbUri) {
      await ensureIndexes();
      await seedStyleMemory();
    }
  } catch (error) {
    console.warn("MongoDB bootstrap failed; health endpoint will report the error.", error);
  }

  console.log("[genie] config", {
    port: config.port,
    mongodbUri: redactedUri,
    mongodbDb: config.mongodbDb,
    mongoConnected: isMongoConnected(),
  });

  app.listen(config.port, () => {
    console.log(`Genie backend listening on http://localhost:${config.port}`);
    console.log(`Demo page: http://localhost:${config.port}/demo`);
    console.log(`Agent trace page: http://localhost:${config.port}/demo/agent-trace.html`);
    console.log(`Raw debug traces: http://localhost:${config.port}/debug`);
  });
}

void startServer();