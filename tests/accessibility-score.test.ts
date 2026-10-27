import assert from "node:assert/strict";
import test from "node:test";
import { calculateAccessibilityScore, violationScoreImpact } from "../lib/auditor/accessibility/accessibility-score";
import type { AccessibilityViolation } from "../lib/auditor/accessibility/accessibility-types";

const violation = (impact: AccessibilityViolation["impact"], affectedNodes: number) => ({ impact, affectedNodes });

test("accessibility scoring is deterministic and impact weighted", () => {
  const input = [violation("critical", 1), violation("serious", 1), violation("minor", 1)];
  assert.equal(calculateAccessibilityScore(input), calculateAccessibilityScore(input));
  assert.ok(violationScoreImpact(violation("critical", 1)) > violationScoreImpact(violation("serious", 1)));
  assert.ok(violationScoreImpact(violation("serious", 1)) > violationScoreImpact(violation("moderate", 1)));
});

test("repeated nodes have a capped contribution", () => {
  assert.equal(violationScoreImpact(violation("critical", 100)), violationScoreImpact(violation("critical", 6)));
  assert.ok(calculateAccessibilityScore([violation("critical", 100)]) > 70);
  assert.equal(calculateAccessibilityScore(Array.from({ length: 20 }, () => violation("critical", 10))), 0);
});
