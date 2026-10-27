import { METRIC_DEFINITIONS } from "./performance-rules";
import type { LighthouseAuditLike, PerformanceMetric, PerformanceMetricId, PerformanceRating } from "./performance-types";

export function lighthouseScoreToPercent(score: number | null | undefined) {
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) return null;
  return Math.round(score * 100);
}

export function metricRating(value: number, good: number, poor: number): PerformanceRating {
  if (!Number.isFinite(value)) return "not-rated";
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export function formatMilliseconds(value: number) {
  return value >= 1_000 ? `${(value / 1_000).toFixed(value >= 10_000 ? 1 : 2).replace(/\.0+$/, "")} s` : `${Math.round(value)} ms`;
}

export function formatCls(value: number) {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function normalizeMetric(id: PerformanceMetricId, audit: LighthouseAuditLike | undefined): PerformanceMetric | undefined {
  if (!audit || typeof audit.numericValue !== "number" || !Number.isFinite(audit.numericValue)) return undefined;
  const definition = METRIC_DEFINITIONS[id];
  const isCls = id === "cls";
  return {
    id,
    label: definition.label,
    value: audit.numericValue,
    displayValue: isCls ? formatCls(audit.numericValue) : formatMilliseconds(audit.numericValue),
    unit: isCls ? "score" : "ms",
    rating: metricRating(audit.numericValue, definition.good, definition.poor),
  };
}
