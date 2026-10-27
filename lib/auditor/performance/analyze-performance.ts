import "server-only";
import { validatePublicUrl } from "../../url/validate-public-url";
import type { HostResolver } from "../../url/resolve-host";
import { resolveHost } from "../../url/resolve-host";
import { PerformanceAuditError } from "./lighthouse-errors";
import { runLighthouse, type LighthouseRunnerDependencies } from "./lighthouse-runner";
import { METRIC_DEFINITIONS, OPPORTUNITY_AUDIT_IDS, PERFORMANCE_LIMITS } from "./performance-rules";
import { lighthouseScoreToPercent, normalizeMetric } from "./performance-score";
import type { LighthouseAuditLike, LighthouseResultLike, PerformanceAuditResponse, PerformanceAuditResult, PerformanceDiagnostics, PerformanceFinding, PerformanceMetricId, PerformanceOpportunity } from "./performance-types";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/\s+/g, " ").trim().slice(0, PERFORMANCE_LIMITS.maximumTextLength) : fallback;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function itemNumber(item: Record<string, unknown> | undefined, key: string) {
  return item ? number(item[key]) : undefined;
}

function extractDiagnostics(audits: Record<string, LighthouseAuditLike | undefined>): PerformanceDiagnostics {
  const diagnostic = audits.diagnostics?.details?.items?.[0];
  const resources = audits["resource-summary"]?.details?.items || [];
  const resource = (type: string) => resources.find((item) => item.resourceType === type);
  const thirdPartyItems = audits["third-party-summary"]?.details?.items || audits["third-parties-insight"]?.details?.items || [];
  const aggregate = (key: string) => thirdPartyItems.reduce((sum, item) => sum + (number(item[key]) || 0), 0) || undefined;
  return {
    totalTransferredBytes: itemNumber(diagnostic, "totalByteWeight") ?? itemNumber(resource("total"), "transferSize"),
    totalResourceCount: itemNumber(diagnostic, "numRequests") ?? itemNumber(resource("total"), "requestCount"),
    domSize: number(audits["dom-size"]?.numericValue) ?? number(audits["dom-size-insight"]?.numericValue),
    scriptBytes: itemNumber(resource("script"), "transferSize"),
    imageBytes: itemNumber(resource("image"), "transferSize"),
    thirdPartyBytes: aggregate("transferSize"),
    thirdPartyMainThreadTimeMs: aggregate("mainThreadTime"),
    mainThreadTimeMs: number(audits["mainthread-work-breakdown"]?.numericValue),
  };
}

function opportunityImpact(item: PerformanceOpportunity) {
  return (item.savingsMs || 0) + (item.savingsBytes || 0) / 1_000;
}

export function extractOpportunities(audits: Record<string, LighthouseAuditLike | undefined>) {
  return OPPORTUNITY_AUDIT_IDS.flatMap((id): PerformanceOpportunity[] => {
    const audit = audits[id];
    if (!audit || audit.scoreDisplayMode === "notApplicable" || audit.score === 1) return [];
    const savingsMs = number(audit.details?.overallSavingsMs);
    const savingsBytes = number(audit.details?.overallSavingsBytes);
    if (!savingsMs && !savingsBytes && (audit.score === null || audit.score === undefined || audit.score >= 0.9)) return [];
    return [{ id, title: text(audit.title, id), description: text(audit.description, "Lighthouse identified a performance optimization."), savingsMs, savingsBytes, displayValue: text(audit.displayValue) || undefined }];
  }).sort((a, b) => opportunityImpact(b) - opportunityImpact(a)).slice(0, PERFORMANCE_LIMITS.maximumOpportunities);
}

function savingsLabel(item: PerformanceOpportunity) {
  const parts: string[] = [];
  if (item.savingsMs) parts.push(`${Math.round(item.savingsMs)} ms`);
  if (item.savingsBytes) parts.push(`${Math.round(item.savingsBytes / 1024)} KB`);
  return parts.join(" / ") || item.displayValue;
}

function metricFinding(id: PerformanceMetricId, metric: NonNullable<PerformanceAuditResult["metrics"][PerformanceMetricId]>): PerformanceFinding | null {
  if (metric.rating === "good" || metric.rating === "not-rated") return null;
  const critical = metric.rating === "poor" && ((id === "lcp" && metric.value > 6_000) || (id === "tbt" && metric.value > 1_200));
  return {
    id: `performance-${id}`,
    severity: critical ? "critical" : metric.rating === "poor" ? "important" : "improvement",
    title: `${metric.label} is ${metric.rating === "poor" ? "slow" : "above the good range"}`,
    description: `The controlled mobile Lighthouse run measured ${metric.label.toLowerCase()} at ${metric.displayValue}.`,
    whyItMatters: id === "cls" ? "Unexpected layout movement can make content difficult to read or interact with." : "Slower loading or main-thread responsiveness can delay when visitors see and use the page.",
    recommendation: id === "lcp" ? "Optimize the largest above-the-fold element, its delivery priority, and server response path." : id === "tbt" ? "Reduce long JavaScript tasks, unused code, and main-thread work." : id === "cls" ? "Reserve dimensions for media and injected content, and avoid shifting existing content." : "Prioritize critical content and reduce render-blocking work and payload size.",
    measuredValue: metric.displayValue,
  };
}

function buildFindings(metrics: PerformanceAuditResult["metrics"], opportunities: PerformanceOpportunity[], diagnostics: PerformanceDiagnostics) {
  const findings: PerformanceFinding[] = [];
  (["lcp", "fcp", "tbt", "cls", "speedIndex"] as PerformanceMetricId[]).forEach((id) => {
    const metric = metrics[id];
    if (metric) { const finding = metricFinding(id, metric); if (finding) findings.push(finding); }
  });
  opportunities.forEach((item) => findings.push({
    id: `performance-${item.id}`, severity: (item.savingsMs || 0) >= 1_000 || (item.savingsBytes || 0) >= 500_000 ? "important" : "improvement",
    title: item.title, description: item.description, whyItMatters: "Addressing this opportunity can reduce page load work in the tested mobile profile.",
    recommendation: `Review the affected resources in Lighthouse and apply the suggested ${item.title.toLowerCase()} optimization.`, potentialSavings: savingsLabel(item),
  }));
  if ((diagnostics.totalTransferredBytes || 0) > 5_000_000) findings.push({ id: "performance-page-weight", severity: "important", title: "Page payload is very large", description: `The measured page transferred about ${Math.round(diagnostics.totalTransferredBytes! / 1024 / 1024 * 10) / 10} MB.`, whyItMatters: "Large transfers are slower and more expensive on constrained mobile networks.", recommendation: "Reduce image, script, and font payloads; lazy-load noncritical resources.", measuredValue: `${Math.round(diagnostics.totalTransferredBytes! / 1024)} KB` });
  if (!findings.length) findings.push({ id: "performance-lab-checks", severity: "passed", title: "Core performance checks passed", description: "The available Lighthouse metrics were within their good ranges and no high-value opportunities were reported.", whyItMatters: "A fast lab result provides a strong baseline for visitors on constrained devices.", recommendation: "Continue monitoring lab and real-user performance as the site changes." });
  return findings.slice(0, PERFORMANCE_LIMITS.maximumFindings);
}

export function normalizeLighthouseResult(lhr: LighthouseResultLike, metadata: { testedUrl: string; durationMs: number; blockedRequests?: number }): PerformanceAuditResult {
  const score = lighthouseScoreToPercent(lhr.categories?.performance?.score);
  if (score === null || !lhr.audits || !lhr.lighthouseVersion) throw new PerformanceAuditError("INVALID_LIGHTHOUSE_RESULT");
  const metrics: PerformanceAuditResult["metrics"] = {};
  (Object.keys(METRIC_DEFINITIONS) as PerformanceMetricId[]).forEach((id) => { const metric = normalizeMetric(id, lhr.audits?.[METRIC_DEFINITIONS[id].auditId]); if (metric) metrics[id] = metric; });
  const opportunities = extractOpportunities(lhr.audits);
  const diagnostics = extractDiagnostics(lhr.audits);
  return { score, metrics, opportunities, diagnostics, findings: buildFindings(metrics, opportunities, diagnostics), metadata: { engine: "lighthouse", lighthouseVersion: lhr.lighthouseVersion, profile: "Simulated mobile", testedUrl: lhr.finalDisplayedUrl || lhr.finalUrl || metadata.testedUrl, durationMs: metadata.durationMs, blockedRequests: metadata.blockedRequests || 0 } };
}

export type PerformanceDependencies = LighthouseRunnerDependencies & { resolver?: HostResolver };

export async function analyzePerformance(finalUrl: string, dependencies: PerformanceDependencies = {}) {
  const resolver = dependencies.resolver || resolveHost;
  try { await validatePublicUrl(finalUrl, resolver); }
  catch { throw new PerformanceAuditError("UNSAFE_NAVIGATION_BLOCKED"); }
  const run = await runLighthouse(finalUrl, { ...dependencies, resolver });
  const tested = run.lhr.finalDisplayedUrl || run.lhr.finalUrl;
  if (tested) {
    try { await validatePublicUrl(tested, resolver); }
    catch { throw new PerformanceAuditError("UNSAFE_NAVIGATION_BLOCKED"); }
  }
  return normalizeLighthouseResult(run.lhr, { testedUrl: finalUrl, durationMs: run.durationMs, blockedRequests: run.blockedRequests });
}

export async function analyzePerformanceSafe(finalUrl: string, dependencies: PerformanceDependencies = {}): Promise<PerformanceAuditResponse> {
  try { return { available: true, result: await analyzePerformance(finalUrl, dependencies) }; }
  catch (error) {
    if (error instanceof PerformanceAuditError) return { available: false, error: { code: error.code, message: error.message } };
    return { available: false, error: { code: "LIGHTHOUSE_AUDIT_FAILED", message: "Lighthouse could not complete the performance measurement." } };
  }
}
