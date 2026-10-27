import type { AccessibilityAuditResponse } from "../auditor/accessibility/accessibility-types";
import type { LinkAuditResult } from "../auditor/links/link-types";
import type { MobileAuditResponse } from "../auditor/mobile/mobile-types";
import type { PerformanceAuditResponse } from "../auditor/performance/performance-types";
import type { SecurityAuditResult } from "../auditor/security/security-types";
import type { SeoAuditResult } from "../auditor/seo/seo-types";

export type AiConfidence = "high" | "medium" | "low";
export type UiUxSeverity = "critical" | "important" | "improvement" | "informational";
export type UiUxPriority = "now" | "next" | "later";
export type AiErrorCode = "PROVIDER_NOT_CONFIGURED" | "PROVIDER_TIMEOUT" | "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "INVALID_JSON" | "RESPONSE_VALIDATION_FAILED";

export type EvidenceCatalogItem = { ref: string; label: string; value: string };

export type AiAnalysisInput = {
  version: 1;
  page: { url: string; hostname: string; title?: string; metaDescriptionPresent: boolean; language?: string; headings: { h1: number; h2: number; h3: number; jumps: number }; images: { total: number; missingAlt: number } };
  performance?: { score: number; metrics: Record<string, { value: number; displayValue: string; rating: string }>; opportunities: Array<{ id: string; title: string; savingsMs?: number; savingsBytes?: number }> };
  mobile?: { score: number; summary: { overflowIssues: number; smallTapTargets: number; tinyTextIssues: number; clippedElements: number; overlayIssues: number }; findings: Array<{ id: string; severity: string; title: string; viewports: string[]; evidence: string[] }> };
  accessibility?: { score: number; violations: Array<{ id: string; impact: string; help: string; affectedNodes: number; examples: string[] }> };
  navigation: { brokenInternalLinks: number; unavailableInternalLinks: number };
  trust: { usesHttps: boolean };
  evidenceCatalog: EvidenceCatalogItem[];
};

export type AiObservation = { title: string; description: string; confidence: AiConfidence; evidenceRefs: string[] };
export type AiIssue = AiObservation & { severity: UiUxSeverity; uxImpact: string; recommendation: string };
export type AiRecommendation = { title: string; action: string; priority: UiUxPriority; confidence: AiConfidence; evidenceRefs: string[] };
export type AiStructuredOutput = { summary: string; strengths: AiObservation[]; issues: AiIssue[]; recommendations: AiRecommendation[] };

export type UiUxAiResult = AiStructuredOutput & {
  score: number;
  metadata: { provider: string; model: string; durationMs: number; usedScreenshots: false; scoring: "deterministic-from-validated-issues" };
};

export type UiUxAuditResponse = { available: true; result: UiUxAiResult } | { available: false; error: { code: AiErrorCode; message: string } };

export type AiEvidenceSources = {
  finalUrl: string;
  seo: SeoAuditResult;
  links: LinkAuditResult;
  security: SecurityAuditResult;
  accessibility: AccessibilityAuditResponse;
  mobile: MobileAuditResponse;
  performance: PerformanceAuditResponse;
};
