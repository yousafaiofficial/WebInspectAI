import assert from "node:assert/strict";
import test from "node:test";
import type { Browser, BrowserContext, Page } from "playwright";
import { analyzeAccessibilitySafe } from "../lib/auditor/accessibility/analyze-accessibility";
import { withIsolatedPage, type BrowserLauncher } from "../lib/browser/create-browser";
import type { HostResolver } from "../lib/url/resolve-host";

const publicResolver: HostResolver = async () => [{ address: "93.184.216.34", family: 4 }];
const audit = (html: string) => analyzeAccessibilitySafe({ html, finalUrl: "https://example.com/audit" }, { resolver: publicResolver, renderingGraceMs: 0 });

const document = (body: string, style = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Accessibility test</title><style>${style}</style></head><body><header><nav aria-label="Primary"><a href="/">Home</a></nav></header><main><h1>Accessibility test</h1>${body}</main><footer>Footer</footer></body></html>`;

test("clean rendered page scores strongly", async () => {
  const response = await audit(document(`<form><label for="email">Email</label><input id="email"><button type="button">Save</button></form><img alt="A useful diagram" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">`));
  assert.equal(response.available, true);
  if (response.available) {
    assert.ok(response.result.score >= 90, `received ${response.result.score}`);
    assert.equal(response.result.metadata.engine, "axe-core");
  }
});

test("detects an input without an accessible label", async () => {
  const response = await audit(document("<form><input type='text'></form>"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.violations.some((item) => item.id === "label"));
});

test("detects an image without alt text", async () => {
  const response = await audit(document("<img src='missing.png'>"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.violations.some((item) => item.id === "image-alt"));
});

test("detects a button without an accessible name", async () => {
  const response = await audit(document("<button type='button'></button>"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.violations.some((item) => item.id === "button-name"));
});

test("detects invalid ARIA attributes", async () => {
  const response = await audit(document("<div aria-not-a-real-attribute='true'>Content</div>"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.violations.some((item) => item.id === "aria-valid-attr"));
});

test("detects duplicate IDs where used by ARIA", async () => {
  const response = await audit(document("<label for='duplicate'>Name</label><input id='duplicate'><input id='duplicate'><button id='active-id'>One</button><a id='active-id' href='/two'>Two</a>"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.violations.some((item) => item.id.includes("duplicate-id")));
});

test("detects a clear color contrast failure", async () => {
  const response = await audit(document("<p class='bad'>Unreadable text</p>", "body{background:#fff}.bad{color:#aaa;background-color:#fff;font-size:14px;font-weight:400}"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.violations.some((item) => item.id === "color-contrast"));
});

test("aggregates repeated nodes under one rule and caps evidence", async () => {
  const response = await audit(document(Array.from({ length: 12 }, (_, index) => `<img src='image-${index}.png'>`).join("")));
  assert.equal(response.available, true);
  if (response.available) {
    const imageRule = response.result.violations.find((item) => item.id === "image-alt");
    assert.equal(imageRule?.affectedNodes, 12);
    assert.equal(imageRule?.examples.length, 5);
    assert.equal(response.result.findings.filter((item) => item.id === "a11y-image-alt").length, 1);
  }
});

test("blocks private subresources while retaining a useful audit", async () => {
  const response = await audit(document("<script src='http://127.0.0.1/private.js'></script><p>Page content remains available.</p>"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.metadata.blockedRequests >= 1);
});

test("blocks an unsafe initial target before launching Chromium", async () => {
  let launched = false;
  const response = await analyzeAccessibilitySafe({ html: document(""), finalUrl: "http://127.0.0.1/" }, { launch: (async () => { launched = true; throw new Error("should not launch"); }) as BrowserLauncher });
  assert.equal(response.available, false);
  if (!response.available) assert.equal(response.error.code, "UNSAFE_NAVIGATION_BLOCKED");
  assert.equal(launched, false);
});

function mockBrowser(options: { gotoError?: Error; taskFailure?: boolean } = {}) {
  const closed = { page: 0, context: 0, browser: 0 };
  const page = { close: async () => { closed.page += 1; }, goto: async () => { if (options.gotoError) throw options.gotoError; }, mainFrame: () => ({}), waitForTimeout: async () => {}, addScriptTag: async () => {}, evaluate: async () => ({}) } as unknown as Page;
  const context = { close: async () => { closed.context += 1; }, newPage: async () => page, route: async () => {}, routeWebSocket: async () => {}, on: () => {} } as unknown as BrowserContext;
  const browser = { close: async () => { closed.browser += 1; }, newContext: async () => context } as unknown as Browser;
  return { closed, launch: (async () => browser) as BrowserLauncher };
}

test("isolated browser resources close on success and failure", async () => {
  const success = mockBrowser();
  await withIsolatedPage(async () => "ok", success.launch);
  assert.deepEqual(success.closed, { page: 1, context: 1, browser: 1 });
  const failure = mockBrowser();
  await assert.rejects(withIsolatedPage(async () => { throw new Error("task failed"); }, failure.launch));
  assert.deepEqual(failure.closed, { page: 1, context: 1, browser: 1 });
});

test("navigation timeout returns a sanitized partial-audit error and cleans up", async () => {
  const timeoutError = Object.assign(new Error("raw browser details"), { name: "TimeoutError" });
  const mocked = mockBrowser({ gotoError: timeoutError });
  const response = await analyzeAccessibilitySafe({ html: document(""), finalUrl: "https://example.com/" }, { resolver: publicResolver, launch: mocked.launch });
  assert.equal(response.available, false);
  if (!response.available) {
    assert.equal(response.error.code, "NAVIGATION_TIMEOUT");
    assert.doesNotMatch(response.error.message, /raw browser details/);
  }
  assert.deepEqual(mocked.closed, { page: 1, context: 1, browser: 1 });
});
