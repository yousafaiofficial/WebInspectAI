import type { IssueSeverity } from "../../audit-types";

export type AccessibilityImpact = "critical" | "serious" | "moderate" | "minor" | "unknown";
export type AccessibilityErrorCode = "BROWSER_LAUNCH_FAILED" | "NAVIGATION_TIMEOUT" | "PAGE_LOAD_FAILED" | "AXE_INJECTION_FAILED" | "AXE_EXECUTION_FAILED" | "UNSAFE_NAVIGATION_BLOCKED" | "AUDIT_TIMEOUT";

export type AccessibilityNodeExample = { target: string; html: string; failureSummary: string };
export type AccessibilityViolation = {
  id: string;
  impact: AccessibilityImpact;
  description: string;
  help: string;
  helpUrl?: string;
  affectedNodes: number;
  examples: AccessibilityNodeExample[];
  tags: string[];
};
export type AccessibilityFinding = {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  evidence: string[];
  whyItMatters: string;
  recommendation: string;
};
export type AccessibilityAuditResult = {
  score: number;
  summary: { violations: number; critical: number; serious: number; moderate: number; minor: number; affectedNodes: number; passedRules: number; incompleteRules: number };
  violations: AccessibilityViolation[];
  findings: AccessibilityFinding[];
  metadata: { engine: "axe-core"; axeVersion: string; testedUrl: string; durationMs: number; blockedRequests: number };
};
export type AccessibilityAuditResponse = { available: true; result: AccessibilityAuditResult } | { available: false; error: { code: AccessibilityErrorCode; message: string } };
export type AccessibilityAuditInput = { html: string; finalUrl: string };
