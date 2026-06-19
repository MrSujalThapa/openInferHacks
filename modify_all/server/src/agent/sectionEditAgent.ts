import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type {
  AgentTraceStep,
  EditableGroup,
  PatchOperation,
  SectionEditAgentResult,
} from "../../../shared/contracts.js";
import { DEMO_USER_ID } from "../../../shared/contracts.js";
import { openinfer } from "../openinfer/client.js";
import { getStyleMemory, saveAgentRun } from "../repos/index.js";
import { parsePatchOperations, validatePatchOperations } from "./validator.js";

type SectionUnderstanding = {
  label: string;
  sectionType: string;
  confidence: number;
};

const SectionEditAnnotation = Annotation.Root({
  userId: Annotation<typeof DEMO_USER_ID>,
  domain: Annotation<string>,
  path: Annotation<string>,
  group: Annotation<EditableGroup>,
  instruction: Annotation<string>,
  styleMemory: Annotation<string[]>,
  sectionUnderstanding: Annotation<SectionUnderstanding | undefined>,
  intent: Annotation<string | undefined>,
  plannedOperations: Annotation<PatchOperation[] | undefined>,
  validatedOperations: Annotation<PatchOperation[] | undefined>,
  critique: Annotation<{ safe: boolean; reason: string } | undefined>,
  trace: Annotation<AgentTraceStep[]>,
  traceId: Annotation<string>,
});

type SectionEditState = typeof SectionEditAnnotation.State;

function traceStep(
  name: string,
  status: AgentTraceStep["status"],
  inputPreview: unknown,
  outputPreview: unknown,
  error?: string,
): AgentTraceStep {
  const now = new Date().toISOString();
  return { name, status, inputPreview, outputPreview, error, startedAt: now, finishedAt: now };
}

async function loadStyleMemory(state: SectionEditState): Promise<Partial<SectionEditState>> {
  const memories = await getStyleMemory();
  return {
    styleMemory: memories,
    trace: [...state.trace, traceStep("LoadStyleMemory", "success", {}, { count: memories.length })],
  };
}

async function openInferUnderstandSection(state: SectionEditState): Promise<Partial<SectionEditState>> {
  const input = {
    label: state.group.label,
    textSignature: state.group.target.textSignature,
    domSummary: state.group.domSummary.slice(0, 8),
    bbox: state.group.target.bbox,
  };

  try {
    const result = await openinfer.chatJson<{ label: string; sectionType: string; confidence: number }>([
      {
        role: "user",
        content: `Understand this webpage section and return JSON with label, sectionType, confidence.\n${JSON.stringify(input)}`,
      },
    ]);
    return {
      sectionUnderstanding: result,
      trace: [
        ...state.trace,
        traceStep("OpenInferUnderstandSection", "success", input, result),
      ],
    };
  } catch (err) {
    const fallback = {
      label: state.group.label ?? state.group.target.textSignature ?? "Section",
      sectionType: "content_block",
      confidence: 0.5,
    };
    return {
      sectionUnderstanding: fallback,
      trace: [
        ...state.trace,
        traceStep("OpenInferUnderstandSection", "failed", input, fallback, String(err)),
      ],
    };
  }
}

async function openInferInterpretIntent(state: SectionEditState): Promise<Partial<SectionEditState>> {
  const input = {
    instruction: state.instruction,
    section: state.sectionUnderstanding,
    styleMemory: state.styleMemory,
  };

  try {
    const result = await openinfer.chatJson<{ intent: string }>([
      {
        role: "user",
        content: `Interpret the user instruction for this section. Return JSON with intent.\n${JSON.stringify(input)}`,
      },
    ]);
    return {
      intent: result.intent,
      trace: [...state.trace, traceStep("OpenInferInterpretIntent", "success", input, result)],
    };
  } catch (err) {
    return {
      intent: state.instruction,
      trace: [
        ...state.trace,
        traceStep("OpenInferInterpretIntent", "failed", input, { intent: state.instruction }, String(err)),
      ],
    };
  }
}

async function openInferPlanPatch(state: SectionEditState): Promise<Partial<SectionEditState>> {
  const input = {
    groupId: state.group.groupId,
    intent: state.intent,
    instruction: state.instruction,
    section: state.sectionUnderstanding,
    styleMemory: state.styleMemory,
  };

  try {
    const result = await openinfer.chatJson<{ operations: PatchOperation[] }>([
      {
        role: "user",
        content: `Plan patch operations for groupId ${state.group.groupId}. Return JSON with operations array only using allowed types.\n${JSON.stringify(input)}`,
      },
    ]);
    const ops = parsePatchOperations(result.operations, state.group.groupId);
    return {
      plannedOperations: ops,
      trace: [...state.trace, traceStep("OpenInferPlanPatch", "success", input, { operations: ops })],
    };
  } catch (err) {
    return {
      plannedOperations: [],
      trace: [...state.trace, traceStep("OpenInferPlanPatch", "failed", input, {}, String(err))],
    };
  }
}

async function validatePatch(state: SectionEditState): Promise<Partial<SectionEditState>> {
  const ops = state.plannedOperations ?? [];
  const { valid, rejected } = validatePatchOperations(ops, state.group.groupId);
  return {
    validatedOperations: valid,
    trace: [
      ...state.trace,
      traceStep("ValidatePatch", "success", ops, { valid, rejected }),
    ],
  };
}

async function openInferCritiquePatch(state: SectionEditState): Promise<Partial<SectionEditState>> {
  const input = {
    instruction: state.instruction,
    intent: state.intent,
    operations: state.validatedOperations,
    groupId: state.group.groupId,
  };

  try {
    const result = await openinfer.chatJson<{ safe: boolean; reason: string }>([
      {
        role: "user",
        content: `Critique this patch for safety and intent match. Return JSON with safe and reason.\n${JSON.stringify(input)}`,
      },
    ]);
    return {
      critique: result,
      trace: [...state.trace, traceStep("OpenInferCritiquePatch", "success", input, result)],
    };
  } catch (err) {
    return {
      critique: { safe: true, reason: "Validator passed; critique skipped due to error." },
      trace: [
        ...state.trace,
        traceStep("OpenInferCritiquePatch", "failed", input, {}, String(err)),
      ],
    };
  }
}

async function repairOrFinalize(state: SectionEditState): Promise<Partial<SectionEditState>> {
  let ops = state.validatedOperations ?? [];
  if (state.critique && !state.critique.safe) {
    ops = ops.filter((op) => op.type !== "hide");
  }
  return {
    validatedOperations: ops,
    trace: [...state.trace, traceStep("RepairOrFinalize", "success", state.critique, { operations: ops })],
  };
}

async function logAgentRun(state: SectionEditState): Promise<Partial<SectionEditState>> {
  await saveAgentRun({
    traceId: state.traceId,
    domain: state.domain,
    path: state.path,
    groupId: state.group.groupId,
    instruction: state.instruction,
    steps: state.trace,
    finalPatch: state.validatedOperations ?? [],
  });
  return {
    trace: [...state.trace, traceStep("LogAgentRun", "success", {}, { traceId: state.traceId })],
  };
}

const graph = new StateGraph(SectionEditAnnotation)
  .addNode("LoadStyleMemory", loadStyleMemory)
  .addNode("OpenInferUnderstandSection", openInferUnderstandSection)
  .addNode("OpenInferInterpretIntent", openInferInterpretIntent)
  .addNode("OpenInferPlanPatch", openInferPlanPatch)
  .addNode("ValidatePatch", validatePatch)
  .addNode("OpenInferCritiquePatch", openInferCritiquePatch)
  .addNode("RepairOrFinalize", repairOrFinalize)
  .addNode("LogAgentRun", logAgentRun)
  .addEdge(START, "LoadStyleMemory")
  .addEdge("LoadStyleMemory", "OpenInferUnderstandSection")
  .addEdge("OpenInferUnderstandSection", "OpenInferInterpretIntent")
  .addEdge("OpenInferInterpretIntent", "OpenInferPlanPatch")
  .addEdge("OpenInferPlanPatch", "ValidatePatch")
  .addEdge("ValidatePatch", "OpenInferCritiquePatch")
  .addEdge("OpenInferCritiquePatch", "RepairOrFinalize")
  .addEdge("RepairOrFinalize", "LogAgentRun")
  .addEdge("LogAgentRun", END);

const compiled = graph.compile();

export async function runSectionEditAgent(input: {
  domain: string;
  path: string;
  group: EditableGroup;
  instruction: string;
}): Promise<SectionEditAgentResult> {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const result = await compiled.invoke({
    userId: DEMO_USER_ID,
    domain: input.domain,
    path: input.path,
    group: input.group,
    instruction: input.instruction,
    styleMemory: [],
    trace: [],
    traceId,
  });

  return {
    sectionLabel: result.sectionUnderstanding?.label ?? input.group.label ?? "Section",
    intent: result.intent ?? input.instruction,
    operations: result.validatedOperations ?? [],
    critique: result.critique ?? { safe: true, reason: "No critique available." },
    traceId,
  };
}

export async function understandGroup(input: {
  domain: string;
  path: string;
  group: Partial<EditableGroup> & { groupId: string; target: EditableGroup["target"]; domSummary: EditableGroup["domSummary"] };
}): Promise<{ groupId: string; label: string; sectionType: string; confidence: number }> {
  const payload = {
    label: input.group.label,
    textSignature: input.group.target.textSignature,
    domSummary: input.group.domSummary.slice(0, 8),
    bbox: input.group.target.bbox,
  };

  const result = await openinfer.chatJson<{ label: string; sectionType: string; confidence: number }>([
    {
      role: "user",
      content: `Understand this webpage section and return JSON with label, sectionType, confidence.\n${JSON.stringify(payload)}`,
    },
  ]);

  return {
    groupId: input.group.groupId,
    label: result.label,
    sectionType: result.sectionType,
    confidence: result.confidence,
  };
}
