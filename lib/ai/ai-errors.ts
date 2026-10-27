import type { AiErrorCode } from "./types";

const messages: Record<AiErrorCode, string> = {
  PROVIDER_NOT_CONFIGURED: "UI/UX analysis is unavailable because no AI provider is configured.",
  PROVIDER_TIMEOUT: "UI/UX analysis took too long and was skipped.",
  RATE_LIMITED: "UI/UX analysis is temporarily rate limited. The deterministic audit is still available.",
  PROVIDER_UNAVAILABLE: "UI/UX analysis is temporarily unavailable. The deterministic audit is still available.",
  INVALID_JSON: "The AI provider returned an unreadable UI/UX analysis.",
  RESPONSE_VALIDATION_FAILED: "The AI provider returned an invalid or unsupported UI/UX analysis.",
};

export class AiAnalysisError extends Error {
  constructor(public readonly code: AiErrorCode, message = messages[code], options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiAnalysisError";
  }
}
