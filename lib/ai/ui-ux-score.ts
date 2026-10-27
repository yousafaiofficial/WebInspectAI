import type { AiIssue } from "./types";

const severityWeight: Record<AiIssue["severity"], number> = { critical: 24, important: 13, improvement: 6, informational: 0 };
const confidenceWeight: Record<AiIssue["confidence"], number> = { high: 1, medium: 0.55, low: 0.15 };

export function calculateUiUxScore(issues: AiIssue[]) {
  const penalty = issues.reduce((sum, issue) => sum + severityWeight[issue.severity] * confidenceWeight[issue.confidence], 0);
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
