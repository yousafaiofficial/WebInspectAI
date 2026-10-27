import { ACCESSIBILITY_IMPACT_WEIGHTS } from "./accessibility-rules";
import type { AccessibilityViolation } from "./accessibility-types";

export function violationScoreImpact(violation: Pick<AccessibilityViolation, "impact" | "affectedNodes">) {
  const base = ACCESSIBILITY_IMPACT_WEIGHTS[violation.impact];
  const repeatedNodeImpact = Math.min(Math.max(0, violation.affectedNodes - 1), 5) * base * 0.15;
  return Math.round((base + repeatedNodeImpact) * 10) / 10;
}

export function calculateAccessibilityScore(violations: Pick<AccessibilityViolation, "impact" | "affectedNodes">[]) {
  const deduction = violations.reduce((sum, violation) => sum + violationScoreImpact(violation), 0);
  return Math.max(0, Math.min(100, Math.round(100 - deduction)));
}
