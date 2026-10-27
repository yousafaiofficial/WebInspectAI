import "server-only";
import { AiAnalysisError } from "./ai-errors";
import { AI_LIMITS } from "./ai-limits";
import { parseAiResponse, validateUiUxResult } from "./parse-ai-response";
import { buildAiPrompt, UI_UX_OUTPUT_SCHEMA } from "./prompt";
import { createConfiguredProvider, type AiProvider } from "./provider";
import type { AiAnalysisInput, UiUxAuditResponse } from "./types";
import { calculateUiUxScore } from "./ui-ux-score";

export async function analyzeUiUx(input: AiAnalysisInput, options: { provider?: AiProvider | null } = {}): Promise<UiUxAuditResponse> {
  const provider = options.provider === undefined ? createConfiguredProvider() : options.provider;
  if (!provider) return { available: false, error: { code: "PROVIDER_NOT_CONFIGURED", message: "UI/UX analysis is unavailable because no AI provider is configured." } };
  try {
    const prompt = buildAiPrompt(input);
    const generated = await provider.generateStructuredAnalysis({ ...prompt, schema: UI_UX_OUTPUT_SCHEMA, maxOutputTokens: AI_LIMITS.maximumOutputTokens, timeoutMs: AI_LIMITS.timeoutMs });
    const output = parseAiResponse(generated.raw, input);
    return { available: true, result: validateUiUxResult({ ...output, score: calculateUiUxScore(output.issues), metadata: { provider: generated.provider, model: generated.model, durationMs: generated.durationMs, usedScreenshots: false, scoring: "deterministic-from-validated-issues" } }) };
  } catch (error) {
    const safe = error instanceof AiAnalysisError ? error : new AiAnalysisError("PROVIDER_UNAVAILABLE");
    return { available: false, error: { code: safe.code, message: safe.message } };
  }
}
