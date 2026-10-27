export const PERFORMANCE_LIMITS = {
  totalTimeoutMs: 55_000,
  chromeLaunchTimeoutMs: 15_000,
  maximumOpportunities: 10,
  maximumFindings: 12,
  maximumTextLength: 280,
} as const;

export const PERFORMANCE_PROFILE = {
  name: "Simulated mobile" as const,
  formFactor: "mobile" as const,
  screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  throttlingMethod: "simulate" as const,
};

export const METRIC_DEFINITIONS = {
  fcp: { auditId: "first-contentful-paint", label: "First Contentful Paint", good: 1_800, poor: 3_000 },
  lcp: { auditId: "largest-contentful-paint", label: "Largest Contentful Paint", good: 2_500, poor: 4_000 },
  speedIndex: { auditId: "speed-index", label: "Speed Index", good: 3_400, poor: 5_800 },
  tbt: { auditId: "total-blocking-time", label: "Total Blocking Time", good: 200, poor: 600 },
  cls: { auditId: "cumulative-layout-shift", label: "Cumulative Layout Shift", good: 0.1, poor: 0.25 },
  interactive: { auditId: "interactive", label: "Time to Interactive", good: 3_800, poor: 7_300 },
  serverResponseTime: { auditId: "server-response-time", label: "Server Response Time", good: 800, poor: 1_800 },
} as const;

export const OPPORTUNITY_AUDIT_IDS = [
  "render-blocking-insight", "render-blocking-resources", "unused-javascript", "unused-css-rules",
  "modern-image-formats", "uses-optimized-images", "uses-responsive-images", "uses-long-cache-ttl",
  "uses-text-compression", "dom-size-insight", "dom-size", "mainthread-work-breakdown", "bootup-time",
  "third-parties-insight", "third-party-summary",
] as const;
