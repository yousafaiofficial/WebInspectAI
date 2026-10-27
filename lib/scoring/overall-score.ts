import { MINIMUM_OVERALL_COVERAGE, OVERALL_CATEGORY_ORDER, OVERALL_SCORE_WEIGHTS, overallGrade } from "./overall-score-rules";
import type { OverallHealthResult, OverallScoreInput } from "./overall-score-types";

function validScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function calculateOverallHealth(input: OverallScoreInput): OverallHealthResult {
  const categories = [] as OverallHealthResult["categories"];
  const unavailableCategories = [] as OverallHealthResult["unavailableCategories"];
  for (const id of OVERALL_CATEGORY_ORDER) {
    const result = input[id];
    if (result?.available && validScore(result.score)) categories.push({ id, score: result.score, baseWeight: OVERALL_SCORE_WEIGHTS[id], effectiveWeight: 0 });
    else unavailableCategories.push({ id, reason: result?.reason || "Analysis unavailable" });
  }
  const coverage = categories.reduce((sum, category) => sum + category.baseWeight, 0);
  if (coverage < MINIMUM_OVERALL_COVERAGE) {
    return { status: "unavailable", score: null, coverage, grade: null, categories, unavailableCategories, explanation: `Overall Website Health requires at least ${MINIMUM_OVERALL_COVERAGE}% category coverage. This audit has ${coverage}% of weighted evidence.` };
  }
  const normalized = categories.map((category) => ({ ...category, effectiveWeight: Number(((category.baseWeight / coverage) * 100).toFixed(2)) }));
  const weighted = normalized.reduce((sum, category) => sum + category.score * (category.effectiveWeight / 100), 0);
  const score = Math.max(0, Math.min(100, Math.round(weighted)));
  return { status: "available", score, coverage, grade: overallGrade(score), categories: normalized, unavailableCategories, explanation: "Website Health is a weighted average of real Performance, SEO, Accessibility, Mobile, Security, Broken Links, and UI/UX results. Unavailable categories are excluded and remaining weights are normalized." };
}
