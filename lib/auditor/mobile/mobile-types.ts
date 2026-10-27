import type { IssueSeverity } from "../../audit-types";
import type { AuditViewport } from "../../browser/viewport-config";

export type MobileRuleId = "viewport-meta" | "horizontal-overflow" | "outside-viewport" | "oversized-media" | "fixed-width" | "tiny-text" | "small-targets" | "target-spacing" | "content-clipping" | "mobile-navigation" | "form-usability" | "fixed-overlay";
export type MobileErrorCode = "BROWSER_LAUNCH_FAILED" | "NAVIGATION_TIMEOUT" | "VIEWPORT_RENDER_FAILED" | "LAYOUT_INSPECTION_FAILED" | "SCREENSHOT_FAILED" | "UNSAFE_NAVIGATION_BLOCKED" | "AUDIT_TIMEOUT";
export type MobileEvidence = { selector: string; width: number; height: number; detail: string };
export type MobileIssueCounts = { outsideViewport: number; oversizedMedia: number; fixedWidth: number; tinyText: number; smallTapTargets: number; tightTapSpacing: number; clipped: number; navigation: number; form: number; overlays: number };
export type MobileViewportResult = AuditViewport & {
  documentWidth: number;
  horizontalOverflow: boolean;
  overflowPixels: number;
  counts: MobileIssueCounts;
  evidence: Record<Exclude<MobileRuleId, "viewport-meta" | "horizontal-overflow">, MobileEvidence[]>;
  renderDurationMs: number;
};
export type MobileFinding = { id: string; severity: IssueSeverity; title: string; description: string; evidence: string[]; whyItMatters: string; recommendation: string; viewports: string[] };
export type MobileAuditResult = {
  score: number;
  summary: { viewportsTested: number; overflowIssues: number; smallTapTargets: number; tinyTextIssues: number; clippedElements: number; overlayIssues: number };
  viewports: MobileViewportResult[];
  findings: MobileFinding[];
  metadata: { engine: "playwright"; durationMs: number; screenshotsCaptured: number; screenshotsPersisted: false; blockedRequests: number };
};
export type MobileAuditResponse = { available: true; result: MobileAuditResult } | { available: false; error: { code: MobileErrorCode; message: string } };
export type MobileAuditInput = { html: string; finalUrl: string; hasViewportMeta: boolean };
