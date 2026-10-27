import type { MobileViewportResult } from "./mobile-types";

export function calculateMobileScore(input: { hasViewportMeta: boolean; viewports: MobileViewportResult[] }) {
  const tested = input.viewports.filter((viewport) => viewport.kind !== "desktop");
  const sum = <K extends keyof MobileViewportResult["counts"]>(key: K) => tested.reduce((total, viewport) => total + viewport.counts[key], 0);
  let deduction = input.hasViewportMeta ? 0 : 15;
  deduction += Math.min(30, tested.filter((viewport) => viewport.horizontalOverflow).length * 12);
  deduction += Math.min(10, sum("outsideViewport") * 2);
  deduction += Math.min(10, sum("oversizedMedia") * 2);
  deduction += Math.min(10, sum("fixedWidth") * 2);
  deduction += Math.min(8, sum("smallTapTargets") * 0.8);
  deduction += Math.min(6, sum("tinyText") * 0.6);
  deduction += Math.min(3, sum("tightTapSpacing") * 0.3);
  deduction += Math.min(10, sum("clipped") * 2);
  deduction += Math.min(12, sum("overlays") * 6);
  deduction += Math.min(9, sum("form") * 3);
  return Math.max(0, Math.min(100, Math.round(100 - deduction)));
}
