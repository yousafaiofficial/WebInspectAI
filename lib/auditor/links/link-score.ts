import type { LinkCheckResult } from "./link-types";

const PENALTIES: Record<LinkCheckResult["status"], number> = {
  healthy: 0,
  redirected: 0,
  broken: 1,
  server_error: 0.8,
  restricted: 0.1,
  unavailable: 0.6,
  blocked: 0,
  other: 0.25,
};

export function calculateLinkScore(results: LinkCheckResult[]): number {
  const scorable = results.filter((item) => item.status !== "blocked");
  if (!scorable.length) return 100;
  const penalty = scorable.reduce((total, item) => total + PENALTIES[item.status], 0) / scorable.length;
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 100)));
}
