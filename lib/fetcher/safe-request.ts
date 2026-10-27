import "server-only";
import http, { type IncomingHttpHeaders } from "node:http";
import https from "node:https";
import type { RedirectInfo } from "../audit-types";
import type { HostResolver, ResolvedAddress } from "../url/resolve-host";
import { resolveHost } from "../url/resolve-host";
import { normalizeUrl } from "../url/normalize-url";
import { validatePublicUrl, validateRedirectTarget } from "../url/validate-public-url";
import { WebsiteFetchError } from "./fetch-errors";

export const USER_AGENT = "WebInspectAI/1.0 Website Audit Bot";
export type NormalizedResponseHeaders = Record<string, string[]>;

export type RawResponse = { status: number; statusText: string; headers: IncomingHttpHeaders; body: Buffer; truncated?: boolean };
export type SafeRequestOptions = { method?: "GET" | "HEAD"; timeoutMs?: number; maxResponseBytes?: number; truncateBody?: boolean; accept?: string };
export type RequestPage = (url: URL, addresses: ResolvedAddress[], options?: SafeRequestOptions) => Promise<RawResponse>;

export function normalizeResponseHeaders(headers: IncomingHttpHeaders): NormalizedResponseHeaders {
  const normalized: NormalizedResponseHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) normalized[name.toLowerCase()] = Array.isArray(value) ? value.map(String) : [String(value)];
  }
  return normalized;
}

export const requestPage: RequestPage = (url, addresses, options = {}) => new Promise((resolve, reject) => {
  const method = options.method || "GET";
  const timeoutMs = options.timeoutMs || 10_000;
  const maxBytes = options.maxResponseBytes ?? 3 * 1024 * 1024;
  const transport = url.protocol === "https:" ? https : http;
  const chosen = addresses[0];
  let exceededLimit = false;
  let settled = false;
  const finish = (callback: () => void) => { if (!settled) { settled = true; callback(); } };

  const request = transport.request(url, {
    method,
    headers: { "User-Agent": USER_AGENT, Accept: options.accept || "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1", "Accept-Encoding": "identity" },
    servername: url.protocol === "https:" ? url.hostname : undefined,
    lookup: (_hostname, _lookupOptions, callback) => callback(null, chosen.address, chosen.family),
  }, (response) => {
    const declaredLength = Number(response.headers["content-length"] || 0);
    if (!options.truncateBody && declaredLength > maxBytes) { exceededLimit = true; response.destroy(new Error("response_limit")); return; }
    const chunks: Buffer[] = [];
    let bytes = 0;
    response.on("data", (chunk: Buffer) => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        if (options.truncateBody) {
          const remaining = Math.max(0, maxBytes - (bytes - chunk.length));
          if (remaining) chunks.push(chunk.subarray(0, remaining));
          finish(() => resolve({ status: response.statusCode || 0, statusText: response.statusMessage || "", headers: response.headers, body: Buffer.concat(chunks), truncated: true }));
          response.destroy();
        } else { exceededLimit = true; response.destroy(new Error("response_limit")); }
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => finish(() => resolve({ status: response.statusCode || 0, statusText: response.statusMessage || "", headers: response.headers, body: Buffer.concat(chunks) })));
    response.on("error", (error) => finish(() => exceededLimit || error.message === "response_limit"
      ? reject(new WebsiteFetchError("RESPONSE_TOO_LARGE", "The response exceeded the allowed download size.", 413))
      : reject(new WebsiteFetchError("CONNECTION_FAILED", "The connection ended before the response finished.", 502))));
  });

  request.setTimeout(timeoutMs, () => request.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
  request.on("error", (error: NodeJS.ErrnoException) => finish(() => {
    if (exceededLimit || error.message === "response_limit") reject(new WebsiteFetchError("RESPONSE_TOO_LARGE", "The response exceeded the allowed download size.", 413));
    else if (error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT") reject(new WebsiteFetchError("TIMEOUT", "The destination took too long to respond.", 408));
    else if (error.code?.startsWith("ERR_TLS") || ["CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(error.code || "")) reject(new WebsiteFetchError("TLS_ERROR", "A secure connection could not be established.", 502));
    else reject(new WebsiteFetchError("CONNECTION_FAILED", "The destination could not be reached.", 502));
  }));
  request.end();
});

export type SafeResourceResult = { requestedUrl: string; normalizedUrl: string; finalUrl: string; redirects: RedirectInfo[]; response: RawResponse };
export type SafeResourceOptions = { resolver?: HostResolver; requester?: RequestPage; request?: SafeRequestOptions; maxRedirects?: number };

export async function requestUrlSafely(input: string, options: SafeResourceOptions = {}): Promise<SafeResourceResult> {
  const resolver = options.resolver || resolveHost;
  const requester = options.requester || requestPage;
  const maximumRedirects = options.maxRedirects ?? 5;
  const initial = normalizeUrl(input);
  let validated = await validatePublicUrl(initial.url, resolver);
  const redirects: RedirectInfo[] = [];
  let response: RawResponse;
  while (true) {
    response = await requester(validated.url, validated.addresses, options.request);
    const rawLocation = response.headers.location;
    const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
    if (!(response.status >= 300 && response.status < 400 && location)) break;
    if (redirects.length >= maximumRedirects) throw new WebsiteFetchError("TOO_MANY_REDIRECTS", "The destination redirected too many times.", 502);
    const next = await validateRedirectTarget(location, validated.url, resolver);
    redirects.push({ from: validated.normalizedUrl, to: next.normalizedUrl, status: response.status });
    validated = next;
  }
  return { requestedUrl: input, normalizedUrl: initial.normalizedUrl, finalUrl: validated.normalizedUrl, redirects, response };
}
