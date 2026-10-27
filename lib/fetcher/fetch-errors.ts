import type { FetchErrorCode, FetchMetadata } from "../audit-types";

export class WebsiteFetchError extends Error {
  constructor(
    public readonly code: FetchErrorCode,
    message: string,
    public readonly status: number,
    public readonly metadata?: FetchMetadata,
  ) {
    super(message);
    this.name = "WebsiteFetchError";
  }
}

export function errorStatus(code: FetchErrorCode) {
  if (["INVALID_URL", "UNSUPPORTED_PROTOCOL", "CREDENTIALS_NOT_ALLOWED"].includes(code)) return 400;
  if (code === "BLOCKED_TARGET") return 403;
  if (code === "TIMEOUT") return 408;
  if (code === "RESPONSE_TOO_LARGE") return 413;
  if (code === "UNSUPPORTED_CONTENT") return 422;
  return 502;
}
