import assert from "node:assert/strict";
import test from "node:test";
import { fetchWebsite, MAX_REDIRECTS, type RequestPage } from "../lib/fetcher/fetch-website";
import { WebsiteFetchError } from "../lib/fetcher/fetch-errors";
import { UrlValidationError } from "../lib/url/normalize-url";
import type { HostResolver } from "../lib/url/resolve-host";

const resolver: HostResolver = async () => [{ address: "93.184.216.34", family: 4 }];

test("returns HTML and real fetch metadata through an injected transport", async () => {
  const requester: RequestPage = async () => ({
    status: 200,
    statusText: "OK",
    headers: { "content-type": "text/html; charset=utf-8" },
    body: Buffer.from("<!doctype html><title>Example</title>"),
  });
  const result = await fetchWebsite(" example.com/path#section ", { resolver, requester });
  assert.equal(result.normalizedUrl, "https://example.com/path");
  assert.equal(result.finalUrl, "https://example.com/path");
  assert.equal(result.httpStatus, 200);
  assert.equal(result.isHtml, true);
  assert.match(result.html || "", /Example/);
});

test("rejects non-HTML content with useful metadata", async () => {
  const requester: RequestPage = async () => ({ status: 200, statusText: "OK", headers: { "content-type": "application/pdf" }, body: Buffer.from("PDF") });
  await assert.rejects(fetchWebsite("example.com/file.pdf", { resolver, requester }), (error: unknown) => {
    return error instanceof WebsiteFetchError && error.code === "UNSUPPORTED_CONTENT" && error.metadata?.contentType === "application/pdf";
  });
});

test("records safe redirects", async () => {
  let calls = 0;
  const requester: RequestPage = async () => {
    calls += 1;
    return calls === 1
      ? { status: 301, statusText: "Moved", headers: { location: "https://www.example.com/home" }, body: Buffer.alloc(0) }
      : { status: 200, statusText: "OK", headers: { "content-type": "text/html" }, body: Buffer.from("<html></html>") };
  };
  const result = await fetchWebsite("example.com", { resolver, requester });
  assert.equal(result.redirectCount, 1);
  assert.equal(result.redirectChain[0].to, "https://www.example.com/home");
});

test("blocks a redirect to a private destination before requesting it", async () => {
  let calls = 0;
  const requester: RequestPage = async () => {
    calls += 1;
    return { status: 302, statusText: "Found", headers: { location: "http://127.0.0.1/admin" }, body: Buffer.alloc(0) };
  };
  await assert.rejects(fetchWebsite("example.com", { resolver, requester }), (error: unknown) => error instanceof UrlValidationError && error.code === "BLOCKED_TARGET");
  assert.equal(calls, 1);
});

test("enforces the redirect limit", async () => {
  const requester: RequestPage = async (url) => {
    const count = Number(url.searchParams.get("hop") || 0) + 1;
    return { status: 302, statusText: "Found", headers: { location: `https://example.com/?hop=${count}` }, body: Buffer.alloc(0) };
  };
  await assert.rejects(fetchWebsite("example.com", { resolver, requester }), (error: unknown) => error instanceof WebsiteFetchError && error.code === "TOO_MANY_REDIRECTS");
  assert.equal(MAX_REDIRECTS, 5);
});
