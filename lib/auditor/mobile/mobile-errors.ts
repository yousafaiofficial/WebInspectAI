import type { MobileErrorCode } from "./mobile-types";

export class MobileAuditError extends Error {
  constructor(public readonly code: MobileErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "MobileAuditError";
  }
}
