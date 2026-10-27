export const ACCESSIBILITY_LIMITS = {
  navigationTimeoutMs: 12_000,
  totalTimeoutMs: 20_000,
  renderingGraceMs: 500,
  nodeExamplesPerRule: 5,
  violations: 50,
  snippetCharacters: 300,
  failureSummaryCharacters: 500,
  maximumSubresourceRequests: 100,
  maximumSubresourceBytes: 2 * 1024 * 1024,
  maximumTotalSubresourceBytes: 15 * 1024 * 1024,
  subresourceTimeoutMs: 5_000,
} as const;

export const ACCESSIBILITY_IMPACT_WEIGHTS = { critical: 12, serious: 8, moderate: 4, minor: 2, unknown: 2 } as const;
