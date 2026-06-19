import type { AgentTraceStep, PatchOperation } from "../../../shared/contracts";

export type AgentRunRecord = {
  traceId: string;
  groupId: string;
  sectionLabel: string;
  instruction: string;
  intent?: string;
  domain?: string;
  path?: string;
  steps: AgentTraceStep[];
  finalPatch: PatchOperation[];
  critique?: { safe: boolean; reason: string };
  createdAt: string;
};

export type AgentTraceTimelineItem = {
  id: string;
  label: string;
  status: "success" | "failed" | "skipped" | "pending";
  detail?: string;
};

export type AgentTraceViewProps = {
  run: AgentRunRecord;
  source: "live" | "mock";
  loading?: boolean;
  error?: string;
};

export type AgentRunsApiResponse = {
  runs?: Array<Record<string, unknown>>;
};
