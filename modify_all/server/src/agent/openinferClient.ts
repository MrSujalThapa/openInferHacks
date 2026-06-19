export type OpenInferClientConfig = {
  baseUrl?: string;
  apiKey?: string;
  model: string;
};

export type OpenInferTextRequest = {
  instructions?: string;
  input: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type OpenInferTextResponse = {
  text: string;
  rawEventCount: number;
};

export class OpenInferClient {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(config: OpenInferClientConfig) {
    this.baseUrl = config.baseUrl?.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  getStatus(): { configured: boolean; baseUrl?: string; model: string } {
    return {
      configured: Boolean(this.baseUrl && this.apiKey && this.model),
      baseUrl: this.baseUrl,
      model: this.model,
    };
  }

  async generateText(request: OpenInferTextRequest): Promise<OpenInferTextResponse> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error("OpenInfer is not configured. Set OPENINFER_BASE_URL and OPENINFER_API_KEY.");
    }

    const response = await fetch(`${this.baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        input: request.input,
        ...(request.instructions ? { instructions: request.instructions } : {}),
        ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
        ...(typeof request.maxOutputTokens === "number"
          ? { max_output_tokens: request.maxOutputTokens }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorPreview = await response.text();
      throw new Error(`OpenInfer request failed with ${response.status}: ${errorPreview.slice(0, 500)}`);
    }

    const bodyText = await response.text();
    return parseResponsesStream(bodyText);
  }
}

function parseResponsesStream(bodyText: string): OpenInferTextResponse {
  const chunks: string[] = [];
  let rawEventCount = 0;

  for (const eventText of bodyText.split("\n\n")) {
    const dataLines = eventText
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim());

    for (const dataLine of dataLines) {
      if (!dataLine || dataLine === "[DONE]") {
        continue;
      }

      rawEventCount += 1;

      try {
        const event = JSON.parse(dataLine) as unknown;
        const delta = readOutputTextDelta(event);
        if (delta) {
          chunks.push(delta);
        }
      } catch {
        // Ignore malformed stream fragments; caller still gets any valid text accumulated so far.
      }
    }
  }

  return {
    text: chunks.join(""),
    rawEventCount,
  };
}

function readOutputTextDelta(event: unknown): string | undefined {
  if (!isRecord(event)) {
    return undefined;
  }

  if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
    return event.delta;
  }

  if (typeof event.text === "string") {
    return event.text;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

