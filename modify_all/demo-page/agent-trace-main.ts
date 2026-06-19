import { AgentTracePanel } from "../extension/src/content/ui/agentTrace";

const mountEl = document.getElementById("agent-trace-root");
const refreshBtn = document.getElementById("refresh-trace");

if (!mountEl) {
  throw new Error("Missing #agent-trace-root");
}

const panel = new AgentTracePanel(mountEl);
void panel.load({ autoRefreshMs: 15000 });

refreshBtn?.addEventListener("click", () => void panel.refresh());
