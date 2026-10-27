import type { FetchErrorCode } from "../audit-types";

export type NormalizedUrlResult = {
  input: string;
  url: URL;
  normalizedUrl: string;
};

export class UrlValidationError extends Error {
  constructor(public readonly code: FetchErrorCode, message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

export function normalizeUrl(input: unknown): NormalizedUrlResult {
  if (typeof input !== "string" || !input.trim()) {
    throw new UrlValidationError("INVALID_URL", "Enter a website URL to continue.");
  }

  const trimmed = input.trim();
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new UrlValidationError("INVALID_URL", "That website address is not valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlValidationError("UNSUPPORTED_PROTOCOL", "Only HTTP and HTTPS website addresses are supported.");
  }
  if (url.username || url.password) {
    throw new UrlValidationError("CREDENTIALS_NOT_ALLOWED", "Website addresses containing usernames or passwords are not supported.");
  }
  if (!url.hostname || url.hostname.length > 253) {
    throw new UrlValidationError("INVALID_URL", "That website address does not contain a valid hostname.");
  }

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  return { input: trimmed, url, normalizedUrl: url.toString() };
}
