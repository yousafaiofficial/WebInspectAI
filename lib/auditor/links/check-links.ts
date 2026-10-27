import "server-only";
import type { HostResolver } from "../../url/resolve-host";
import { UrlValidationError } from "../../url/normalize-url";
import { WebsiteFetchError } from "../../fetcher/fetch-errors";
import { requestUrlSafely, type RequestPage } from "../../fetcher/safe-request";
import { extractLinks } from "./extract-links";
import { calculateLinkScore } from "./link-score";
import type { LinkAuditResult, LinkCheckResult, LinkFinding, LinkStatus } from "./link-types";

export const LINK_CHECK_LIMIT = 50;
export const LINK_CHECK_CONCURRENCY = 5;
export const LINK_TIMEOUT_MS = 5_000;
export const LINK_BODY_LIMIT = 16 * 1024;
const EVIDENCE_LIMIT = 5;

export type LinkProbe = (url: string, internal: boolean) => Promise<LinkCheckResult>;

function classify(status: number, redirects: number): LinkStatus {
  if (status >= 200 && status < 300) return redirects ? "redirected" : "healthy";
  if (status === 404 || status === 410) return "broken";
  if (status >= 500) return "server_error";
  if (status === 401 || status === 403 || status === 429) return "restricted";
  return "other";
}

export function createSafeLinkProbe(dependencies: { resolver?: HostResolver; requester?: RequestPage } = {}): LinkProbe {
  return async (url, internal) => {
    try {
      let resource = await requestUrlSafely(url, {
        ...dependencies, maxRedirects: 5,
        request: { method: "HEAD", timeoutMs: LINK_TIMEOUT_MS, maxResponseBytes: 0, truncateBody: true, accept: "*/*" },
      });
      if (resource.response.status >= 400) {
        resource = await requestUrlSafely(url, {
          ...dependencies, maxRedirects: 5,
          request: { method: "GET", timeoutMs: LINK_TIMEOUT_MS, maxResponseBytes: LINK_BODY_LIMIT, truncateBody: true, accept: "*/*" },
        });
      }
      return {
        url, internal, status: classify(resource.response.status, resource.redirects.length),
        httpStatus: resource.response.status, statusText: resource.response.statusText,
        finalUrl: resource.finalUrl, redirectCount: resource.redirects.length,
      };
    } catch (error) {
      if (error instanceof UrlValidationError && error.code === "BLOCKED_TARGET") return { url, internal, status: "blocked", redirectCount: 0, errorCode: error.code };
      if (error instanceof WebsiteFetchError || error instanceof UrlValidationError) return { url, internal, status: "unavailable", redirectCount: 0, errorCode: error.code };
      return { url, internal, status: "unavailable", redirectCount: 0, errorCode: "UPSTREAM_ERROR" };
    }
  };
}

async function boundedMap<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function examples(results: LinkCheckResult[], status: LinkStatus) {
  return results.filter((item) => item.status === status).slice(0, EVIDENCE_LIMIT).map((item) => `${item.url}${item.httpStatus ? ` (${item.httpStatus})` : ""}`);
}

function buildFindings(results: LinkCheckResult[], skipped: number): LinkFinding[] {
  const findings: LinkFinding[] = [];
  const add = (finding: LinkFinding) => findings.push(finding);
  const broken = results.filter((item) => item.status === "broken");
  const server = results.filter((item) => item.status === "server_error");
  const unavailable = results.filter((item) => item.status === "unavailable");
  const blocked = results.filter((item) => item.status === "blocked");
  const redirected = results.filter((item) => item.status === "redirected");
  if (broken.length) add({ id: "broken-links", severity: "important", title: `${broken.length} confirmed broken link${broken.length === 1 ? "" : "s"}`, description: "These destinations returned HTTP 404 or 410 after safe redirect handling.", evidence: examples(results, "broken"), whyItMatters: "Broken destinations interrupt visitor journeys and can make page maintenance appear unreliable.", recommendation: "Update each destination, remove the link, or add an appropriate permanent redirect." });
  if (server.length) add({ id: "link-server-errors", severity: "important", title: `${server.length} link destination${server.length === 1 ? " has" : "s have"} server errors`, description: "These destinations returned a 5xx response.", evidence: examples(results, "server_error"), whyItMatters: "Server failures prevent visitors from reaching the linked resource, although they may be temporary.", recommendation: "Recheck the destination and contact its owner or replace the link if failures continue." });
  if (unavailable.length) add({ id: "unavailable-links", severity: "improvement", title: `${unavailable.length} link destination${unavailable.length === 1 ? " was" : "s were"} unavailable`, description: "DNS, timeout, TLS, redirect, or connection errors prevented confirmation.", evidence: examples(results, "unavailable"), whyItMatters: "Visitors may encounter the same failure, but transient network conditions are possible.", recommendation: "Retry these links and update or remove destinations that remain unavailable." });
  if (blocked.length) add({ id: "blocked-links", severity: "improvement", title: `${blocked.length} unsafe or private target${blocked.length === 1 ? " was" : "s were"} skipped`, description: "WebInspectAI did not request private or restricted network destinations.", evidence: examples(results, "blocked"), whyItMatters: "Skipping these URLs protects internal services and does not mean the links are broken.", recommendation: "Review whether public page links should point to private or local destinations." });
  if (skipped) add({ id: "link-limit", severity: "improvement", title: `${skipped} link${skipped === 1 ? " was" : "s were"} skipped by the audit limit`, description: `The first ${LINK_CHECK_LIMIT} unique HTTP(S) destinations were checked to keep the audit bounded.`, evidence: [], whyItMatters: "The report does not claim to have tested every link when the page exceeds the configured limit.", recommendation: "Review the remaining destinations manually or audit a more focused page." });
  if (redirected.length) add({ id: "redirected-links", severity: "improvement", title: `${redirected.length} working link${redirected.length === 1 ? " uses" : "s use"} redirects`, description: "These links ultimately reached a successful destination.", evidence: examples(results, "redirected"), whyItMatters: "Redirects are often valid, but direct destinations reduce latency and redirect dependencies.", recommendation: "Update links to their final URLs when the redirect is permanent and under your control." });
  if (!broken.length && !server.length && !unavailable.length) add({ id: "link-health", severity: "passed", title: "Checked links are reachable", description: "No confirmed broken links or unavailable public destinations were detected in the checked set.", evidence: [], whyItMatters: "Working links support reliable navigation.", recommendation: "No action is needed. Continue checking links as content changes." });
  return findings;
}

export async function checkLinks(input: { html: string; finalUrl: string }, options: { limit?: number; concurrency?: number; probe?: LinkProbe } = {}): Promise<LinkAuditResult> {
  const started = performance.now();
  const extracted = extractLinks(input.html, input.finalUrl);
  const limit = Math.max(0, options.limit ?? LINK_CHECK_LIMIT);
  const selected = extracted.httpLinks.slice(0, limit);
  const probe = options.probe || createSafeLinkProbe();
  const results = await boundedMap(selected, Math.max(1, options.concurrency ?? LINK_CHECK_CONCURRENCY), (item) => probe(item.url, item.internal));
  const skippedDueToLimit = Math.max(0, extracted.httpLinks.length - selected.length);
  const count = (status: LinkStatus) => results.filter((item) => item.status === status).length;
  const blocked = count("blocked");
  return {
    score: calculateLinkScore(results),
    summary: {
      anchors: extracted.anchors, httpDiscovered: extracted.httpLinks.length, checked: results.length - blocked,
      healthy: count("healthy"), redirected: count("redirected"), broken: count("broken"), serverErrors: count("server_error"),
      restricted: count("restricted"), unavailable: count("unavailable"), blocked, skippedDueToLimit,
      notCheckable: extracted.hashOnly + extracted.empty + extracted.mailto + extracted.tel + extracted.unsupported,
    },
    classification: { hashOnly: extracted.hashOnly, empty: extracted.empty, mailto: extracted.mailto, tel: extracted.tel, unsupported: extracted.unsupported },
    links: results.sort((a, b) => Number(a.status === "healthy") - Number(b.status === "healthy")).slice(0, LINK_CHECK_LIMIT),
    findings: buildFindings(results, skippedDueToLimit),
    durationMs: Math.round(performance.now() - started),
  };
}
