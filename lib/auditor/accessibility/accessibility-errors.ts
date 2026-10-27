import type { AccessibilityErrorCode } from "./accessibility-types";

export class AccessibilityAuditError extends Error {
  constructor(public readonly code: AccessibilityErrorCode, message: string) {
    super(message);
    this.name = "AccessibilityAuditError";
  }
}
