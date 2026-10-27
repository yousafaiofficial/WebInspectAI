import type { AuditIssue, FetchMetadata } from "../audit-types";
import type { AccessibilityAuditResponse } from "../auditor/accessibility/accessibility-types";
import type { LinkAuditResult } from "../auditor/links/link-types";
import type { MobileAuditResponse } from "../auditor/mobile/mobile-types";
import type { PerformanceAuditResponse } from "../auditor/performance/performance-types";
import type { SecurityAuditResult } from "../auditor/security/security-types";
import type { SeoAuditResult } from "../auditor/seo/seo-types";
import type { UiUxAuditResponse } from "../ai/types";
import { calculateOverallHealth } from "../scoring/overall-score";
import type { OverallHealthResult } from "../scoring/overall-score-types";
import { normalizeFindings } from "./normalize-findings";

export type AuditStatus = "complete" | "partial" | "failed";
export type ReportSummary = {
  status: AuditStatus;
  url: string;
  auditedAt: string;
  overall: OverallHealthResult;
  findings: AuditIssue[];
  topIssues: AuditIssue[];
  counts: { critical: number; important: number; improvement: number; passed: number };
};

type SummaryInput = { metadata: FetchMetadata; seo: SeoAuditResult; links: LinkAuditResult; security: SecurityAuditResult; accessibility: AccessibilityAuditResponse; mobile: MobileAuditResponse; performance: PerformanceAuditResponse; uiUx: UiUxAuditResponse };

function unavailableReason(result: { available: false; error: { message: string } }) { return result.error.message; }

export function buildReportSummary(input: SummaryInput): ReportSummary {
  const overall = calculateOverallHealth({
    performance: input.performance.available ? { available: true, score: input.performance.result.score } : { available: false, reason: unavailableReason(input.performance) },
    seo: { available: true, score: input.seo.score },
    accessibility: input.accessibility.available ? { available: true, score: input.accessibility.result.score } : { available: false, reason: unavailableReason(input.accessibility) },
    mobile: input.mobile.available ? { available: true, score: input.mobile.result.score } : { available: false, reason: unavailableReason(input.mobile) },
    security: { available: true, score: input.security.score },
    links: { available: true, score: input.links.score },
    uiUx: input.uiUx.available ? { available: true, score: input.uiUx.result.score } : { available: false, reason: unavailableReason(input.uiUx) },
  });
  const findings = normalizeFindings(input);
  const counts = findings.reduce((result, finding) => ({ ...result, [finding.severity]: result[finding.severity] + 1 }), { critical: 0, important: 0, improvement: 0, passed: 0 });
  const status: AuditStatus = overall.status === "unavailable" ? "failed" : overall.unavailableCategories.length ? "partial" : "complete";
  return { status, url: input.metadata.finalUrl, auditedAt: input.metadata.fetchedAt, overall, findings, topIssues: findings.filter((finding) => finding.severity !== "passed").slice(0, 5), counts };
}
