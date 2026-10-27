import type { OverallCategoryId } from "./overall-score-types";

export const OVERALL_SCORE_WEIGHTS: Record<OverallCategoryId, number> = {
  performance: 20,
  seo: 15,
  accessibility: 15,
  mobile: 15,
  security: 15,
  links: 10,
  uiUx: 10,
};

export const MINIMUM_OVERALL_COVERAGE = 60;
export const OVERALL_CATEGORY_ORDER: OverallCategoryId[] = ["performance", "seo", "accessibility", "mobile", "security", "links", "uiUx"];

export function overallGrade(score: number) {
  if (score >= 90) return "Excellent" as const;
  if (score >= 80) return "Good" as const;
  if (score >= 70) return "Fair" as const;
  if (score >= 60) return "Needs improvement" as const;
  return "Poor" as const;
}
