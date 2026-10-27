import type { PerformanceErrorCode } from "./performance-types";

const messages: Record<PerformanceErrorCode, string> = {
  BROWSER_LAUNCH_FAILED: "The performance browser could not be started.",
  LIGHTHOUSE_INITIALIZATION_FAILED: "Lighthouse could not connect to the performance browser.",
  NAVIGATION_FAILED: "The page could not be loaded for performance measurement.",
  AUDIT_TIMEOUT: "The performance audit exceeded its time limit.",
  UNSAFE_NAVIGATION_BLOCKED: "The performance browser was prevented from opening a private or unsafe address.",
  LIGHTHOUSE_AUDIT_FAILED: "Lighthouse could not complete the performance measurement.",
  INVALID_LIGHTHOUSE_RESULT: "Lighthouse returned an incomplete performance result.",
};

export class PerformanceAuditError extends Error {
  constructor(public readonly code: PerformanceErrorCode, message = messages[code], options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PerformanceAuditError";
  }
}
