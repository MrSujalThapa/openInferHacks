import { fetchLatestAgentRun } from "./agentTraceApi";
import { AgentTraceView } from "./agentTraceView";
import type { AgentRunRecord } from "./agentTraceTypes";

export class AgentTracePanel {
  private view: AgentTraceView;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private mountEl: HTMLElement) {
    this.view = new AgentTraceView();
    mountEl.appendChild(this.view.root);
  }

  async load(options?: { autoRefreshMs?: number }): Promise<{ run: AgentRunRecord; source: "live" | "mock" }> {
    this.view.render({ run: {} as AgentRunRecord, source: "mock", loading: true });

    const result = await fetchLatestAgentRun();
    this.view.render({ run: result.run, source: result.source });

    if (options?.autoRefreshMs) {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(() => void this.refresh(), options.autoRefreshMs);
    }

    return result;
  }

  async refresh(): Promise<void> {
    const result = await fetchLatestAgentRun();
    this.view.render({ run: result.run, source: result.source });
  }

  showMock(run: AgentRunRecord): void {
    this.view.render({ run, source: "mock" });
  }

  destroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.view.root.remove();
  }
}

export { MOCK_AGENT_RUN } from "./mockAgentTrace";
export type { AgentRunRecord, AgentTraceViewProps } from "./agentTraceTypes";
