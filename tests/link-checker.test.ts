import assert from "node:assert/strict";
import test from "node:test";
import { checkLinks, createSafeLinkProbe, type LinkProbe } from "../lib/auditor/links/check-links";
import { extractLinks } from "../lib/auditor/links/extract-links";
import { calculateLinkScore } from "../lib/auditor/links/link-score";
import type { LinkCheckResult } from "../lib/auditor/links/link-types";
import type { HostResolver } from "../lib/url/resolve-host";
import type { RequestPage } from "../lib/fetcher/safe-request";

const pageUrl = "https://example.com/docs/page";

test("extracts, classifies, resolves, and deduplicates page links", () => {
  const result = extractLinks(`<a href="/about">A</a><a href="https://example.com/about#team">B</a><a href="https://other.example/x">X</a><a href="#top">Hash</a><a href="mailto:a@b.com">Mail</a><a href="tel:123">Tel</a><a href="javascript:void(0)">JS</a><a>No href</a>`, pageUrl);
  assert.equal(result.anchors, 8);
  assert.deepEqual(result.httpLinks, [
    { url: "https://example.com/about", internal: true },
    { url: "https://other.example/x", internal: false },
  ]);
  assert.deepEqual({ hash: result.hashOnly, mail: result.mailto, tel: result.tel, unsupported: result.unsupported, empty: result.empty }, { hash: 1, mail: 1, tel: 1, unsupported: 1, empty: 1 });
});

test("aggregates broken, unavailable, redirected, and healthy outcomes", async () => {
  const statuses: Record<string, LinkCheckResult["status"]> = { broken: "broken", down: "unavailable", moved: "redirected", good: "healthy" };
  const probe: LinkProbe = async (url, internal) => {
    const key = Object.keys(statuses).find((item) => url.includes(item))!;
    return { url, internal, status: statuses[key], httpStatus: key === "broken" ? 404 : 200, redirectCount: key === "moved" ? 1 : 0 };
  };
  const result = await checkLinks({ html: `<a href="/good">G</a><a href="/broken">B</a><a href="/down">D</a><a href="/moved">M</a>`, finalUrl: pageUrl }, { probe });
  assert.equal(result.summary.checked, 4);
  assert.equal(result.summary.broken, 1);
  assert.equal(result.summary.unavailable, 1);
  assert.equal(result.summary.redirected, 1);
  assert.ok(result.score < 100);
  assert.ok(result.findings.some((item) => item.id === "broken-links"));
  assert.ok(!result.findings.some((item) => item.id === "link-health"));
});

test("enforces the per-page limit and bounded concurrency", async () => {
  let active = 0;
  let maximumActive = 0;
  const probe: LinkProbe = async (url, internal) => {
    active += 1; maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return { url, internal, status: "healthy", httpStatus: 200, redirectCount: 0 };
  };
  const html = Array.from({ length: 20 }, (_, index) => `<a href="/page-${index}">Page</a>`).join("");
  const result = await checkLinks({ html, finalUrl: pageUrl }, { probe, limit: 10, concurrency: 3 });
  assert.equal(result.summary.httpDiscovered, 20);
  assert.equal(result.summary.checked, 10);
  assert.equal(result.summary.skippedDueToLimit, 10);
  assert.ok(maximumActive <= 3);
  assert.ok(result.findings.some((item) => item.id === "link-limit"));
});

test("safe link probe blocks private targets without invoking transport", async () => {
  let requested = false;
  const requester: RequestPage = async () => { requested = true; throw new Error("must not run"); };
  const result = await createSafeLinkProbe({ requester })("http://127.0.0.1/admin", true);
  assert.equal(result.status, "blocked");
  assert.equal(requested, false);
});

test("safe link probe falls back from failed HEAD to lightweight GET", async () => {
  const methods: string[] = [];
  const resolver: HostResolver = async () => [{ address: "93.184.216.34", family: 4 }];
  const requester: RequestPage = async (_url, _addresses, options) => {
    methods.push(options?.method || "GET");
    return options?.method === "HEAD"
      ? { status: 405, statusText: "Method Not Allowed", headers: {}, body: Buffer.alloc(0) }
      : { status: 200, statusText: "OK", headers: {}, body: Buffer.alloc(0) };
  };
  const result = await createSafeLinkProbe({ resolver, requester })("https://example.com/resource", false);
  assert.deepEqual(methods, ["HEAD", "GET"]);
  assert.equal(result.status, "healthy");
});

test("link score is deterministic and excludes safety-blocked URLs", () => {
  const basic = (status: LinkCheckResult["status"]): LinkCheckResult => ({ url: `https://example.com/${status}`, internal: true, status, redirectCount: 0 });
  assert.equal(calculateLinkScore([basic("healthy"), basic("broken")]), 50);
  assert.equal(calculateLinkScore([basic("blocked")]), 100);
  assert.equal(calculateLinkScore([basic("redirected")]), 100);
});
