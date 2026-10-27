export const MOBILE_LIMITS = {
  navigationTimeoutMs: 12_000,
  totalTimeoutMs: 35_000,
  renderingGraceMs: 500,
  overflowTolerancePx: 4,
  evidencePerRule: 5,
  maximumElementsInspected: 3_000,
  maximumFindings: 12,
  tinyTextPx: 12,
  smallTapTargetPx: 24,
  tapSpacingPx: 2,
  overlayViewportRatio: 0.25,
  screenshots: 3,
} as const;
