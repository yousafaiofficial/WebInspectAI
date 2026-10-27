import type { IssueSeverity } from "../../audit-types";

export type PerformanceRating = "good" | "needs-improvement" | "poor" | "not-rated";
export type PerformanceMetricId = "fcp" | "lcp" | "speedIndex" | "tbt" | "cls" | "interactive" | "serverResponseTime";
export type PerformanceErrorCode =
  | "BROWSER_LAUNCH_FAILED"
  | "LIGHTHOUSE_INITIALIZATION_FAILED"
  | "NAVIGATION_FAILED"
  | "AUDIT_TIMEOUT"
  | "UNSAFE_NAVIGATION_BLOCKED"
  | "LIGHTHOUSE_AUDIT_FAILED"
  | "INVALID_LIGHTHOUSE_RESULT";

export type PerformanceMetric = {
  id: PerformanceMetricId;
  label: string;
  value: number;
  displayValue: string;
  unit: "ms" | "score";
  rating: PerformanceRating;
};

export type PerformanceOpportunity = {
  id: string;
  title: string;
  description: string;
  savingsMs?: number;
  savingsBytes?: number;
  displayValue?: string;
};

export type PerformanceDiagnostics = {
  totalTransferredBytes?: number;
  totalResourceCount?: number;
  domSize?: number;
  scriptBytes?: number;
  imageBytes?: number;
  thirdPartyBytes?: number;
  thirdPartyMainThreadTimeMs?: number;
  mainThreadTimeMs?: number;
};

export type PerformanceFinding = {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  whyItMatters: string;
  recommendation: string;
  measuredValue?: string;
  potentialSavings?: string;
};

export type PerformanceAuditResult = {
  score: number;
  metrics: Partial<Record<PerformanceMetricId, PerformanceMetric>>;
  opportunities: PerformanceOpportunity[];
  diagnostics: PerformanceDiagnostics;
  findings: PerformanceFinding[];
  metadata: {
    engine: "lighthouse";
    lighthouseVersion: string;
    profile: "Simulated mobile";
    testedUrl: string;
    durationMs: number;
    blockedRequests: number;
  };
};

export type PerformanceAuditResponse =
  | { available: true; result: PerformanceAuditResult }
  | { available: false; error: { code: PerformanceErrorCode; message: string } };

export type LighthouseAuditLike = {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
  details?: { overallSavingsMs?: number; overallSavingsBytes?: number; items?: Array<Record<string, unknown>> };
};

export type LighthouseResultLike = {
  lighthouseVersion?: string;
  finalDisplayedUrl?: string;
  finalUrl?: string;
  categories?: { performance?: { score?: number | null } };
  audits?: Record<string, LighthouseAuditLike | undefined>;
};
