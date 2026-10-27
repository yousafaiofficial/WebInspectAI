import "server-only";
import OpenAI from "openai";
import { AiAnalysisError } from "./ai-errors";
import type { AiAnalysisInput } from "./types";

export type AiProviderRequest = { instructions: string; input: AiAnalysisInput; schema: Record<string, unknown>; maxOutputTokens: number; timeoutMs: number };
export type AiProviderResult = { raw: string; provider: string; model: string; durationMs: number };

export interface AiProvider {
  generateStructuredAnalysis(request: AiProviderRequest): Promise<AiProviderResult>;
}

export class OpenAiProvider implements AiProvider {
  private readonly client: OpenAI;
  constructor(private readonly apiKey: string, private readonly model = "gpt-4o-mini") {
    this.client = new OpenAI({ apiKey, maxRetries: 0 });
  }

  async generateStructuredAnalysis(request: AiProviderRequest): Promise<AiProviderResult> {
    const started = performance.now();
    try {
      const response = await this.client.responses.create({
        model: this.model,
        instructions: request.instructions,
        input: `AUDIT_EVIDENCE_JSON_START\n${JSON.stringify(request.input)}\nAUDIT_EVIDENCE_JSON_END`,
        max_output_tokens: request.maxOutputTokens,
        store: false,
        text: { format: { type: "json_schema", name: "webinspectai_ui_ux", strict: true, schema: request.schema } },
      }, { signal: AbortSignal.timeout(request.timeoutMs), timeout: request.timeoutMs, maxRetries: 0 });
      if (!response.output_text) throw new AiAnalysisError("INVALID_JSON");
      return { raw: response.output_text, provider: "openai", model: this.model, durationMs: Math.round(performance.now() - started) };
    } catch (error) {
      if (error instanceof AiAnalysisError) throw error;
      if (error instanceof OpenAI.RateLimitError) throw new AiAnalysisError("RATE_LIMITED");
      if (error instanceof OpenAI.APIConnectionTimeoutError || error instanceof OpenAI.APIUserAbortError || (error instanceof Error && error.name === "TimeoutError")) throw new AiAnalysisError("PROVIDER_TIMEOUT");
      throw new AiAnalysisError("PROVIDER_UNAVAILABLE");
    }
  }
}

export function createConfiguredProvider(environment: NodeJS.ProcessEnv = process.env): AiProvider | null {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAiProvider(apiKey, environment.OPENAI_MODEL?.trim() || "gpt-4o-mini");
}
