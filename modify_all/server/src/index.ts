import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { connectMongo, isMongoConnected, seedStyleMemory } from "./mongo.js";
import { apiRouter } from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  await connectMongo();
  await seedStyleMemory();

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/api", apiRouter);

  const demoPagePath = path.resolve(__dirname, "../../demo-page");
  app.use("/demo", express.static(demoPagePath));
  app.get("/demo", (_req, res) => {
    res.sendFile(path.join(demoPagePath, "index.html"));
  });

  app.get("/debug", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html><head><title>Genie Agent Traces</title>
<style>
body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;background:#0f172a;color:#e2e8f0}
h1{color:#38bdf8}pre{background:#1e293b;padding:1rem;border-radius:8px;overflow:auto;font-size:13px}
.card{background:#1e293b;border-radius:12px;padding:1rem;margin:1rem 0;border:1px solid #334155}
.step{font-size:12px;color:#94a3b8;margin:4px 0}
</style></head><body>
<h1>Genie Agent Traces</h1>
<p>Latest OpenInfer + LangGraph runs from MongoDB</p>
<div id="runs">Loading...</div>
<script>
fetch('/api/agent-runs?limit=5').then(r=>r.json()).then(d=>{
  const el=document.getElementById('runs');
  if(!d.runs||!d.runs.length){el.innerHTML='<p>No runs yet. Double-click a group and use Genie.</p>';return}
  el.innerHTML=d.runs.map(r=>\`<div class="card">
    <strong>\${r.instruction}</strong>
    <div class="step">trace: \${r.traceId} · group: \${r.groupId} · \${new Date(r.createdAt).toLocaleString()}</div>
    \${(r.steps||[]).map(s=>\`<div class="step">\${s.name}: \${s.status}</div>\`).join('')}
    <pre>\${JSON.stringify(r.finalPatch,null,2)}</pre>
  </div>\`).join('');
});
</script></body></html>`);
  });

  app.listen(PORT, () => {
    console.log(`[genie] server http://localhost:${PORT}`);
    console.log(`[genie] demo page http://localhost:${PORT}/demo`);
    console.log(`[genie] debug traces http://localhost:${PORT}/debug`);
    console.log(`[genie] mongo: ${isMongoConnected() ? "connected" : "disconnected"}`);
  });
}

main().catch(console.error);
