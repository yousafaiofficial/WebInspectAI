import { SEO_RULES } from "./seo-rules";
import type { SeoCheck, SeoCheckStatus, SeoRuleId } from "./seo-types";

const STATUS_MULTIPLIER: Record<SeoCheckStatus, number> = {
  passed: 0,
  info: 0.2,
  warning: 0.55,
  failed: 1,
};

export function scoreImpact(ruleId: SeoRuleId, status: SeoCheckStatus): number {
  return Math.round(SEO_RULES[ruleId].weight * STATUS_MULTIPLIER[status]);
}

export function calculateSeoScore(checks: Pick<SeoCheck, "scoreImpact">[]): number {
  const deductions = checks.reduce((total, check) => total + check.scoreImpact, 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}
