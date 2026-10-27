import { SECURITY_RULES } from "./security-rules";
import type { SecurityCheck, SecurityCheckStatus, SecurityRuleId } from "./security-types";

const MULTIPLIER: Record<SecurityCheckStatus, number> = { passed: 0, not_applicable: 0, info: 0.1, warning: 0.5, failed: 1 };

export function securityScoreImpact(id: SecurityRuleId, status: SecurityCheckStatus) {
  return Math.round(SECURITY_RULES[id].weight * MULTIPLIER[status]);
}

export function calculateSecurityScore(checks: Pick<SecurityCheck, "scoreImpact">[]) {
  return Math.max(0, Math.min(100, 100 - checks.reduce((sum, item) => sum + item.scoreImpact, 0)));
}
