type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_RULES = `You edit only the selected group on a webpage.
Never output JavaScript, HTML, or URLs.
Never affect the whole website.
Return JSON only.
Use only allowed patch operation types: style, move, resize, hide, compact.
For style operations, only use these CSS properties: backgroundColor, color, borderRadius, opacity, fontSize, padding, margin, boxShadow, border, overflow.`;

export class OpenInferClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private mockMode: boolean;

  constructor() {
    this.baseUrl = process.env.OPENINFER_BASE_URL ?? "";
    this.apiKey = process.env.OPENINFER_API_KEY ?? "";
    this.model = process.env.OPENINFER_MODEL ?? "default";
    this.mockMode = !this.baseUrl || !this.apiKey;
    if (this.mockMode) {
      console.warn("[openinfer] running in mock mode — set OPENINFER_BASE_URL and OPENINFER_API_KEY");
    }
  }

  async chatJson<T>(messages: ChatMessage[]): Promise<T> {
    if (this.mockMode) {
      return this.mockResponse<T>(messages);
    }

    const url = `${this.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "system", content: SYSTEM_RULES }, ...messages],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenInfer error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content) as T;
  }

  private mockResponse<T>(messages: ChatMessage[]): T {
    const last = messages[messages.length - 1]?.content ?? "";
    const groupMatch =
      last.match(/for groupId ([a-zA-Z0-9_-]+)/) ??
      last.match(/groupId[":\s]+([a-zA-Z0-9_-]+)/);
    const groupId = groupMatch?.[1] ?? "group_mock";
    const instruction = last.toLowerCase();

    if (last.includes("Understand this webpage section")) {
      const textMatch = last.match(/textSignature[":\s]+([^"}\n]+)/);
      const label = textMatch?.[1]?.trim() || "Page Section";
      return {
        label: label.slice(0, 40),
        sectionType: label.toLowerCase().includes("news") ? "right_sidebar" : "content_block",
        confidence: 0.88,
      } as T;
    }

    if (last.includes("Interpret the user instruction")) {
      return {
        intent: instruction.includes("dark")
          ? "make the selected section compact and dark mode"
          : "adjust the selected section per user request",
      } as T;
    }

    if (last.includes("Plan patch operations")) {
      const ops: unknown[] = [];
      if (instruction.includes("compact") || instruction.includes("dark") || instruction.includes("match")) {
        ops.push({ type: "compact", targetId: groupId });
      }
      if (instruction.includes("dark") || instruction.includes("match")) {
        ops.push({
          type: "style",
          targetId: groupId,
          css: {
            backgroundColor: "#111827",
            color: "#f9fafb",
            borderRadius: "16px",
            opacity: "0.9",
          },
        });
      }
      if (instruction.includes("hide")) {
        ops.push({ type: "hide", targetId: groupId });
      }
      if (instruction.includes("move lower") || instruction.includes("move down")) {
        ops.push({ type: "move", targetId: groupId, translateY: 80 });
      }
      if (ops.length === 0) {
        ops.push({
          type: "style",
          targetId: groupId,
          css: { borderRadius: "12px", opacity: "0.95" },
        });
      }
      return { operations: ops } as T;
    }

    if (last.includes("Critique this patch")) {
      return {
        safe: true,
        reason: "Operations affect only the selected group and use allowed properties.",
      } as T;
    }

    return {} as T;
  }
}

export const openinfer = new OpenInferClient();
