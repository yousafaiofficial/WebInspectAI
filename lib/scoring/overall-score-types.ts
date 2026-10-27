export type OverallCategoryId = "performance" | "seo" | "accessibility" | "mobile" | "security" | "links" | "uiUx";
export type OverallScoreInput = Partial<Record<OverallCategoryId, { score?: number; available?: boolean; reason?: string }>>;
export type OverallScoreCategory = { id: OverallCategoryId; score: number; baseWeight: number; effectiveWeight: number };
export type UnavailableOverallCategory = { id: OverallCategoryId; reason?: string };

export type OverallHealthResult = {
  status: "available" | "unavailable";
  score: number | null;
  coverage: number;
  grade: "Excellent" | "Good" | "Fair" | "Needs improvement" | "Poor" | null;
  categories: OverallScoreCategory[];
  unavailableCategories: UnavailableOverallCategory[];
  explanation: string;
};
