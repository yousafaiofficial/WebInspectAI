import type { AuditIssue, IssueSeverity } from "../audit-types";
import type { AccessibilityAuditResponse } from "../auditor/accessibility/accessibility-types";
import type { LinkAuditResult } from "../auditor/links/link-types";
import type { MobileAuditResponse } from "../auditor/mobile/mobile-types";
import type { PerformanceAuditResponse } from "../auditor/performance/performance-types";
import type { SecurityAuditResult } from "../auditor/security/security-types";
import type { SeoAuditResult } from "../auditor/seo/seo-types";
import type { UiUxAuditResponse } from "../ai/types";

const severityRank: Record<IssueSeverity, number> = { critical: 0, important: 1, improvement: 2, passed: 3 };
const categoryRank: Record<AuditIssue["category"], number> = { Performance: 0, Security: 1, Accessibility: 2, Mobile: 3, "Broken Links": 4, SEO: 5, "UI/UX": 6 };

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100); }
function sortFindings(findings: AuditIssue[]) { return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || categoryRank[a.category] - categoryRank[b.category] || a.id.localeCompare(b.id)); }
function unique(findings: AuditIssue[]) { const seen = new Set<string>(); return findings.filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id))); }

export function normalizeFindings(input: { seo: SeoAuditResult; links: LinkAuditResult; security: SecurityAuditResult; accessibility: AccessibilityAuditResponse; mobile: MobileAuditResponse; performance: PerformanceAuditResponse; uiUx: UiUxAuditResponse }) {
  const findings: AuditIssue[] = [
    ...input.seo.checks.map((item) => ({ id: `seo.${item.id}`, severity: item.severity, category: "SEO" as const, title: item.title, description: item.description, impact: item.scoreImpact ? `This finding reduces the deterministic SEO score by ${item.scoreImpact} points.${item.evidence.length ? ` Evidence: ${item.evidence.join("; ")}` : ""}` : "This check passed or has informational impact only.", fix: item.recommendation, source: "real" as const })),
    ...input.links.findings.map((item) => ({ id: `links.${item.id}`, severity: item.severity, category: "Broken Links" as const, title: item.title, description: item.description, impact: `${item.whyItMatters}${item.evidence.length ? ` Evidence: ${item.evidence.join("; ")}` : ""}`, fix: item.recommendation, source: "real" as const })),
    ...input.security.checks.map((item) => ({ id: `security.${item.id}`, severity: item.severity, category: "Security" as const, title: item.title, description: item.description, impact: item.scoreImpact ? `This finding reduces the deterministic security score by ${item.scoreImpact} points.${item.evidence.length ? ` Evidence: ${item.evidence.join("; ")}` : ""}` : "This control passed or has informational impact only.", fix: item.recommendation, source: "real" as const })),
    ...(input.accessibility.available ? input.accessibility.result.findings.map((item) => ({ id: `accessibility.${item.id}`, severity: item.severity, category: "Accessibility" as const, title: item.title, description: item.description, impact: `${item.whyItMatters}${item.evidence.length ? ` Evidence: ${item.evidence.join("; ")}` : ""}`, fix: item.recommendation, source: "real" as const })) : []),
    ...(input.mobile.available ? input.mobile.result.findings.map((item) => ({ id: `mobile.${item.id}`, severity: item.severity, category: "Mobile" as const, title: item.title, description: `${item.description}${item.viewports.length ? ` Affected: ${item.viewports.join(", ")}.` : ""}`, impact: `${item.whyItMatters}${item.evidence.length ? ` Evidence: ${item.evidence.join("; ")}` : ""}`, fix: item.recommendation, source: "real" as const })) : []),
    ...(input.performance.available ? input.performance.result.findings.map((item) => ({ id: `performance.${item.id}`, severity: item.severity, category: "Performance" as const, title: item.title, description: `${item.description}${item.measuredValue ? ` Measured: ${item.measuredValue}.` : ""}`, impact: `${item.whyItMatters}${item.potentialSavings ? ` Potential savings: ${item.potentialSavings}.` : ""}`, fix: item.recommendation, source: "real" as const })) : []),
    ...(input.uiUx.available ? input.uiUx.result.issues.filter((item) => item.severity !== "informational").map((item) => ({ id: `uiux.${slug(item.title)}`, severity: item.severity as IssueSeverity, category: "UI/UX" as const, title: item.title, description: item.description, impact: `${item.uxImpact} Evidence: ${item.evidenceRefs.join("; ")}. Confidence: ${item.confidence}.`, fix: item.recommendation, source: "real" as const })) : []),
  ];
  return sortFindings(unique(findings));
}
