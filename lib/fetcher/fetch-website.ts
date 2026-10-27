import "server-only";
import type { FetchMetadata, ServerWebsiteFetchResult } from "../audit-types";
import type { HostResolver } from "../url/resolve-host";
import { WebsiteFetchError } from "./fetch-errors";
import { normalizeResponseHeaders, requestPage, requestUrlSafely, type RequestPage } from "./safe-request";

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
export const MAX_REDIRECTS = 5;
export { USER_AGENT, requestPage } from "./safe-request";
export type { RequestPage } from "./safe-request";

type FetchDependencies = { resolver?: HostResolver; requester?: RequestPage };

export async function fetchWebsite(requestedUrl: string, dependencies: FetchDependencies = {}): Promise<ServerWebsiteFetchResult> {
  const started = performance.now();
  const resource = await requestUrlSafely(requestedUrl, {
    resolver: dependencies.resolver,
    requester: dependencies.requester || requestPage,
    maxRedirects: MAX_REDIRECTS,
    request: { method: "GET", timeoutMs: FETCH_TIMEOUT_MS, maxResponseBytes: MAX_RESPONSE_BYTES },
  });
  const { response } = resource;
  const contentType = String(response.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const preview = response.body.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  const isHtml = contentType === "text/html" || contentType === "application/xhtml+xml" || (!contentType && (preview.startsWith("<!doctype html") || preview.startsWith("<html")));
  const final = new URL(resource.finalUrl);
  const metadata: FetchMetadata = {
    requestedUrl,
    normalizedUrl: resource.normalizedUrl,
    finalUrl: resource.finalUrl,
    hostname: final.hostname,
    httpStatus: response.status,
    statusText: response.statusText,
    contentType: contentType || "unknown",
    responseSize: response.body.length,
    redirectCount: resource.redirects.length,
    redirectChain: resource.redirects,
    fetchDurationMs: Math.round(performance.now() - started),
    fetchedAt: new Date().toISOString(),
    isHtml,
  };
  if (!isHtml) throw new WebsiteFetchError("UNSUPPORTED_CONTENT", "The address is reachable, but it does not return an HTML webpage.", 422, metadata);
  return { ...metadata, html: response.body.toString("utf8"), responseHeaders: normalizeResponseHeaders(response.headers) };
}
