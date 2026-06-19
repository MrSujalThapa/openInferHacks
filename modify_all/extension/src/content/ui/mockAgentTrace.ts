import type { AgentRunRecord } from "./agentTraceTypes";

/** Demo-safe fallback when the backend is offline or has no runs yet. */
export const MOCK_AGENT_RUN: AgentRunRecord = {
  traceId: "trace_demo_news_sidebar",
  groupId: "group_news_sidebar",
  sectionLabel: "News Sidebar",
  instruction: "Make this compact dark mode and less distracting.",
  intent: "reduce visual prominence while preserving readability",
  domain: "linkedin.com",
  path: "/feed",
  critique: {
    safe: true,
    reason: "Operations affect only the selected group and use allowed properties.",
  },
  createdAt: new Date().toISOString(),
  steps: [
    {
      name: "LoadStyleMemory",
      status: "success",
      outputPreview: { count: 1 },
      startedAt: new Date(Date.now() - 4200).toISOString(),
      finishedAt: new Date(Date.now() - 4100).toISOString(),
    },
    {
      name: "OpenInferUnderstandSection",
      status: "success",
      outputPreview: { label: "News Sidebar", sectionType: "right_sidebar", confidence: 0.91 },
      startedAt: new Date(Date.now() - 4000).toISOString(),
      finishedAt: new Date(Date.now() - 3600).toISOString(),
    },
    {
      name: "OpenInferInterpretIntent",
      status: "success",
      outputPreview: { intent: "reduce visual prominence while preserving readability" },
      startedAt: new Date(Date.now() - 3500).toISOString(),
      finishedAt: new Date(Date.now() - 3100).toISOString(),
    },
    {
      name: "OpenInferPlanPatch",
      status: "success",
      outputPreview: { operations: 2 },
      startedAt: new Date(Date.now() - 3000).toISOString(),
      finishedAt: new Date(Date.now() - 2400).toISOString(),
    },
    {
      name: "ValidatePatch",
      status: "success",
      outputPreview: { valid: true, rejected: 0 },
      startedAt: new Date(Date.now() - 2300).toISOString(),
      finishedAt: new Date(Date.now() - 2200).toISOString(),
    },
    {
      name: "OpenInferCritiquePatch",
      status: "success",
      outputPreview: { safe: true, reason: "Patch only affects the selected group." },
      startedAt: new Date(Date.now() - 2100).toISOString(),
      finishedAt: new Date(Date.now() - 1700).toISOString(),
    },
    {
      name: "RepairOrFinalize",
      status: "success",
      outputPreview: { operations: 2 },
      startedAt: new Date(Date.now() - 1600).toISOString(),
      finishedAt: new Date(Date.now() - 1500).toISOString(),
    },
    {
      name: "LogAgentRun",
      status: "success",
      outputPreview: { traceId: "trace_demo_news_sidebar" },
      startedAt: new Date(Date.now() - 1400).toISOString(),
      finishedAt: new Date(Date.now() - 1300).toISOString(),
    },
  ],
  finalPatch: [
    { type: "compact", targetId: "group_news_sidebar" },
    {
      type: "style",
      targetId: "group_news_sidebar",
      css: {
        backgroundColor: "#111827",
        color: "#f9fafb",
        borderRadius: "16px",
        opacity: "0.86",
      },
    },
  ],
};
