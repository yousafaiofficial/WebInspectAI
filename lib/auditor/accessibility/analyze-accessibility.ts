import "server-only";
import type { Result as AxeViolation } from "axe-core";
import type { HostResolver } from "../../url/resolve-host";
import { resolveHost } from "../../url/resolve-host";
import { validatePublicUrl } from "../../url/validate-public-url";
import { createBrowser, withIsolatedPage, type BrowserLauncher } from "../../browser/create-browser";
import { configureSafeNavigation } from "../../browser/safe-navigation";
import { AccessibilityAuditError } from "./accessibility-errors";
import { ACCESSIBILITY_LIMITS } from "./accessibility-rules";
import { calculateAccessibilityScore } from "./accessibility-score";
import type { AccessibilityAuditInput, AccessibilityAuditResponse, AccessibilityAuditResult, AccessibilityImpact, AccessibilityViolation } from "./accessibility-types";
import { runAxe } from "./run-axe";

const impactRank: Record<AccessibilityImpact, number> = { critical: 4, serious: 3, moderate: 2, minor: 1, unknown: 0 };

function truncate(value: string, limit: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

function safeHtml(value: string) {
  return truncate(value.replace(/\svalue\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, " value=\"[redacted]\""), ACCESSIBILITY_LIMITS.snippetCharacters);
}

function normalizeImpact(impact: AxeViolation["impact"]): AccessibilityImpact {
  return impact === "critical" || impact === "serious" || impact === "moderate" || impact === "minor" ? impact : "unknown";
}

function transformViolation(violation: AxeViolation): AccessibilityViolation {
  return {
    id: violation.id,
    impact: normalizeImpact(violation.impact),
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    affectedNodes: violation.nodes.length,
    tags: violation.tags.slice(0, 20),
    examples: violation.nodes.slice(0, ACCESSIBILITY_LIMITS.nodeExamplesPerRule).map((node) => ({
      target: node.target.map((part) => Array.isArray(part) ? part.join(" ") : String(part)).join(" "),
      html: safeHtml(node.html),
      failureSummary: truncate(node.failureSummary || "Review this element against the rule guidance.", ACCESSIBILITY_LIMITS.failureSummaryCharacters),
    })),
  };
}

function toResult(axeResult: Awaited<ReturnType<typeof runAxe>>, testedUrl: string, started: number, blockedRequests: number): AccessibilityAuditResult {
  const allViolations = axeResult.violations.map(transformViolation).sort((a, b) => impactRank[b.impact] - impactRank[a.impact] || b.affectedNodes - a.affectedNodes);
  const violations = allViolations.slice(0, ACCESSIBILITY_LIMITS.violations);
  const count = (impact: AccessibilityImpact) => allViolations.filter((item) => item.impact === impact).length;
  const findings = violations.map((violation) => ({
    id: `a11y-${violation.id}`,
    severity: violation.impact === "critical" ? "critical" as const : violation.impact === "serious" ? "important" as const : "improvement" as const,
    title: violation.help,
    description: `${violation.description} ${violation.affectedNodes} affected element${violation.affectedNodes === 1 ? " was" : "s were"} detected.`,
    evidence: violation.examples.map((example) => `${example.target}: ${example.failureSummary}`),
    whyItMatters: `axe classified this rule as ${violation.impact} and associated it with ${violation.tags.slice(0, 4).join(", ") || "accessibility best practices"}.`,
    recommendation: `${violation.examples[0]?.failureSummary || "Review the affected elements and correct the rule failure."}${violation.helpUrl ? ` Guidance: ${violation.helpUrl}` : ""}`,
  }));
  return {
    score: calculateAccessibilityScore(allViolations),
    summary: {
      violations: allViolations.length, critical: count("critical"), serious: count("serious"), moderate: count("moderate"), minor: count("minor"),
      affectedNodes: allViolations.reduce((sum, item) => sum + item.affectedNodes, 0), passedRules: axeResult.passes.length, incompleteRules: axeResult.incomplete.length,
    },
    violations,
    findings,
    metadata: { engine: "axe-core", axeVersion: axeResult.testEngine.version, testedUrl, durationMs: Math.round(performance.now() - started), blockedRequests },
  };
}

export type AccessibilityDependencies = {
  resolver?: HostResolver;
  launch?: BrowserLauncher;
  navigationTimeoutMs?: number;
  totalTimeoutMs?: number;
  renderingGraceMs?: number;
};

export async function analyzeAccessibility(input: AccessibilityAuditInput, dependencies: AccessibilityDependencies = {}): Promise<AccessibilityAuditResult> {
  const started = performance.now();
  const resolver = dependencies.resolver || resolveHost;
  try { await validatePublicUrl(input.finalUrl, resolver); }
  catch { throw new AccessibilityAuditError("UNSAFE_NAVIGATION_BLOCKED", "The accessibility browser was prevented from opening a private or unsafe address."); }

  let taskEntered = false;
  try {
    return await withIsolatedPage(async (page, context) => {
      taskEntered = true;
      const state = await configureSafeNavigation({ page, context, finalUrl: input.finalUrl, html: input.html, resolver });
      const totalTimeout = dependencies.totalTimeoutMs ?? ACCESSIBILITY_LIMITS.totalTimeoutMs;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new AccessibilityAuditError("AUDIT_TIMEOUT", "The accessibility audit exceeded its total time limit.")), totalTimeout);
      });
      const audit = async () => {
        try {
          await page.goto(input.finalUrl, { waitUntil: "domcontentloaded", timeout: dependencies.navigationTimeoutMs ?? ACCESSIBILITY_LIMITS.navigationTimeoutMs });
        } catch (error) {
          if ((error as Error).name === "TimeoutError") throw new AccessibilityAuditError("NAVIGATION_TIMEOUT", "The rendered page took too long to load for accessibility testing.");
          throw new AccessibilityAuditError("PAGE_LOAD_FAILED", "The rendered page could not be loaded for accessibility testing.");
        }
        await page.waitForTimeout(dependencies.renderingGraceMs ?? ACCESSIBILITY_LIMITS.renderingGraceMs);
        if (state.unsafeMainNavigation) throw new AccessibilityAuditError("UNSAFE_NAVIGATION_BLOCKED", "The page attempted to navigate the accessibility browser to an unsafe address.");
        const axeResult = await runAxe(page);
        if (state.unsafeMainNavigation) throw new AccessibilityAuditError("UNSAFE_NAVIGATION_BLOCKED", "The page attempted to navigate the accessibility browser to an unsafe address.");
        return toResult(axeResult, input.finalUrl, started, state.blockedRequests);
      };
      try { return await Promise.race([audit(), deadline]); }
      finally { if (timeout) clearTimeout(timeout); }
    }, dependencies.launch || createBrowser);
  } catch (error) {
    if (error instanceof AccessibilityAuditError) throw error;
    if (!taskEntered) throw new AccessibilityAuditError("BROWSER_LAUNCH_FAILED", "The accessibility browser could not be started.");
    throw new AccessibilityAuditError("AXE_EXECUTION_FAILED", "The accessibility audit could not be completed.");
  }
}

export async function analyzeAccessibilitySafe(input: AccessibilityAuditInput, dependencies: AccessibilityDependencies = {}): Promise<AccessibilityAuditResponse> {
  try { return { available: true, result: await analyzeAccessibility(input, dependencies) }; }
  catch (error) {
    if (error instanceof AccessibilityAuditError) return { available: false, error: { code: error.code, message: error.message } };
    return { available: false, error: { code: "AXE_EXECUTION_FAILED", message: "The accessibility audit could not be completed." } };
  }
}
