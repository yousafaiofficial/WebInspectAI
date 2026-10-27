import { AiAnalysisError } from "./ai-errors";
import { AI_LIMITS } from "./ai-limits";
import type { AiAnalysisInput, AiConfidence, AiIssue, AiObservation, AiRecommendation, AiStructuredOutput, UiUxAiResult, UiUxPriority, UiUxSeverity } from "./types";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AiAnalysisError("RESPONSE_VALIDATION_FAILED");
  return value as Record<string, unknown>;
}

function string(value: unknown, maximum: number) {
  if (typeof value !== "string") throw new AiAnalysisError("RESPONSE_VALIDATION_FAILED");
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean || clean.length > maximum) throw new AiAnalysisError("RESPONSE_VALIDATION_FAILED");
  return clean;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new AiAnalysisError("RESPONSE_VALIDATION_FAILED");
  return value as T;
}

function array(value: unknown, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) throw new AiAnalysisError("RESPONSE_VALIDATION_FAILED");
  return value;
}

function evidenceRefs(value: unknown, validRefs: Set<string>) {
  const refs = array(value, AI_LIMITS.maximumEvidenceRefs).map((item) => string(item, 120));
  if (!refs.length || refs.some((ref) => !validRefs.has(ref))) throw new AiAnalysisError("RESPONSE_VALIDATION_FAILED");
  return Array.from(new Set(refs));
}

function observation(value: unknown, validRefs: Set<string>): AiObservation {
  const item = record(value);
  return { title: string(item.title, AI_LIMITS.maximumShortText), description: string(item.description, AI_LIMITS.maximumLongText), confidence: enumValue<AiConfidence>(item.confidence, ["high", "medium", "low"]), evidenceRefs: evidenceRefs(item.evidenceRefs, validRefs) };
}

export function parseAiResponse(raw: string, input: AiAnalysisInput): AiStructuredOutput {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new AiAnalysisError("INVALID_JSON"); }
  const root = record(parsed);
  const validRefs = new Set(input.evidenceCatalog.map((item) => item.ref));
  const strengths = array(root.strengths, AI_LIMITS.maximumStrengths).map((item) => observation(item, validRefs));
  const issues = array(root.issues, AI_LIMITS.maximumIssues).map((value): AiIssue => {
    const item = record(value);
    return { ...observation(item, validRefs), severity: enumValue<UiUxSeverity>(item.severity, ["critical", "important", "improvement", "informational"]), uxImpact: string(item.uxImpact, AI_LIMITS.maximumLongText), recommendation: string(item.recommendation, AI_LIMITS.maximumLongText) };
  });
  const uniqueIssues = issues.filter((issue, index) => issues.findIndex((candidate) => candidate.title.toLowerCase() === issue.title.toLowerCase()) === index);
  const recommendations = array(root.recommendations, AI_LIMITS.maximumRecommendations).map((value): AiRecommendation => {
    const item = record(value);
    return { title: string(item.title, AI_LIMITS.maximumShortText), action: string(item.action, AI_LIMITS.maximumLongText), priority: enumValue<UiUxPriority>(item.priority, ["now", "next", "later"]), confidence: enumValue<AiConfidence>(item.confidence, ["high", "medium", "low"]), evidenceRefs: evidenceRefs(item.evidenceRefs, validRefs) };
  });
  return { summary: string(root.summary, AI_LIMITS.maximumLongText), strengths, issues: uniqueIssues, recommendations };
}

export function validateUiUxResult(value: UiUxAiResult) {
  if (!Number.isInteger(value.score) || value.score < 0 || value.score > 100) throw new AiAnalysisError("RESPONSE_VALIDATION_FAILED");
  return value;
}
