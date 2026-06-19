import type { AgentTraceStep, PatchOperation } from "../../../shared/contracts";
import type { AgentRunRecord, AgentRunsApiResponse } from "./agentTraceTypes";
import { MOCK_AGENT_RUN } from "./mockAgentTrace";

const API_BASE = "http://localhost:4000";

const STEP_TO_TIMELINE: Record<string, string> = {
  LoadStyleMemory: "Retrieved style memory",
  OpenInferUnderstandSection: "Understood section with OpenInfer",
  OpenInferInterpretIntent: "Interpreted user intent",
  OpenInferPlanPatch: "Planned patch",
  ValidatePatch: "Validated safe operations",
  OpenInferCritiquePatch: "Critiqued patch",
  RepairOrFinalize: "Repaired or finalized patch",
  LogAgentRun: "Saved customization to MongoDB",
};

export function timelineLabelForStep(stepName: string): string {
  return STEP_TO_TIMELINE[stepName] ?? stepName;
}

export async function fetchLatestAgentRun(): Promise<{ run: AgentRunRecord; source: "live" | "mock" }> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-runs?limit=1`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as AgentRunsApiResponse;
    const raw = data.runs?.[0];
    if (!raw) throw new Error("No agent runs");
    return { run: normalizeAgentRun(raw), source: "live" };
  } catch {
    return { run: MOCK_AGENT_RUN, source: "mock" };
  }
}

function normalizeAgentRun(raw: Record<string, unknown>): AgentRunRecord {
  const steps = Array.isArray(raw.steps) ? raw.steps.map(normalizeStep) : [];
  const finalPatch = Array.isArray(raw.finalPatch) ? (raw.finalPatch as PatchOperation[]) : [];
  const intent = extractIntent(steps);

  return {
    traceId: String(raw.traceId ?? "unknown"),
    groupId: String(raw.groupId ?? "unknown"),
    sectionLabel: extractSectionLabel(steps) ?? String(raw.groupId ?? "Selected section"),
    instruction: String(raw.instruction ?? ""),
    intent,
    domain: raw.domain ? String(raw.domain) : undefined,
    path: raw.path ? String(raw.path) : undefined,
    steps,
    finalPatch,
    critique: extractCritique(steps),
    createdAt: toIso(raw.createdAt) ?? new Date().toISOString(),
  };
}

function normalizeStep(raw: unknown): AgentTraceStep {
  const step = raw as Record<string, unknown>;
  return {
    name: String(step.name ?? "Unknown"),
    status: (step.status as AgentTraceStep["status"]) ?? "success",
    inputPreview: step.inputPreview,
    outputPreview: step.outputPreview,
    error: step.error ? String(step.error) : undefined,
    startedAt: toIso(step.startedAt) ?? new Date().toISOString(),
    finishedAt: toIso(step.finishedAt) ?? new Date().toISOString(),
  };
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function extractSectionLabel(steps: AgentTraceStep[]): string | undefined {
  const understand = steps.find((s) => s.name === "OpenInferUnderstandSection");
  const out = understand?.outputPreview as { label?: string } | undefined;
  return out?.label;
}

function extractIntent(steps: AgentTraceStep[]): string | undefined {
  const interpret = steps.find((s) => s.name === "OpenInferInterpretIntent");
  const out = interpret?.outputPreview as { intent?: string } | undefined;
  return out?.intent;
}

function extractCritique(steps: AgentTraceStep[]): { safe: boolean; reason: string } | undefined {
  const critique = steps.find((s) => s.name === "OpenInferCritiquePatch");
  const out = critique?.outputPreview as { safe?: boolean; reason?: string } | undefined;
  if (out && typeof out.safe === "boolean") {
    return { safe: out.safe, reason: String(out.reason ?? "") };
  }
  return undefined;
}

export function buildTimeline(run: AgentRunRecord): Array<{
  id: string;
  label: string;
  status: "success" | "failed" | "skipped";
  detail?: string;
}> {
  const items: Array<{
    id: string;
    label: string;
    status: "success" | "failed" | "skipped";
    detail?: string;
  }> = [
    {
      id: "loaded-group",
      label: "Loaded selected group",
      status: "success",
      detail: run.sectionLabel,
    },
  ];

  for (const step of run.steps) {
    if (step.name === "OpenInferInterpretIntent") continue;
    if (step.name === "RepairOrFinalize") continue;

    let detail: string | undefined;
    if (step.name === "LoadStyleMemory") {
      const out = step.outputPreview as { count?: number } | undefined;
      detail = out?.count != null ? `${out.count} memory item(s)` : undefined;
    }
    if (step.name === "OpenInferUnderstandSection") {
      const out = step.outputPreview as { sectionType?: string; confidence?: number } | undefined;
      if (out?.sectionType) {
        detail = out.confidence != null
          ? `${out.sectionType} · ${Math.round(out.confidence * 100)}% confidence`
          : out.sectionType;
      }
    }
    if (step.name === "OpenInferPlanPatch") {
      const out = step.outputPreview as { operations?: number | unknown[] } | undefined;
      const count = Array.isArray(out?.operations) ? out.operations.length : out?.operations;
      if (count != null) detail = `${count} operation(s)`;
    }
    if (step.name === "ValidatePatch") {
      const out = step.outputPreview as { valid?: boolean; rejected?: number } | undefined;
      if (out?.valid === false) detail = `${out.rejected ?? 0} rejected`;
      else detail = "All operations allowed";
    }
    if (step.name === "OpenInferCritiquePatch" && run.critique) {
      detail = run.critique.reason;
    }
    if (step.name === "LogAgentRun") {
      detail = run.traceId;
    }

    items.push({
      id: step.name,
      label: timelineLabelForStep(step.name),
      status: step.status,
      detail,
    });
  }

  return items;
}
