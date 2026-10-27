import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMobileSafe } from "../lib/auditor/mobile/analyze-mobile";
import type { BrowserLauncher } from "../lib/browser/create-browser";
import type { HostResolver } from "../lib/url/resolve-host";

const publicResolver: HostResolver = async () => [{ address: "93.184.216.34", family: 4 }];
const baseStyle = `*{box-sizing:border-box}html,body{margin:0;max-width:100%}body{font:16px sans-serif}main{width:100%;padding:16px}nav{display:flex;flex-wrap:wrap;gap:16px}a,button,input{min-height:32px}`;
const page = (body: string, style = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mobile fixture</title><style>${baseStyle}${style}</style></head><body><nav><a href="#home">Home</a><a href="#about">About</a></nav><main><h1>Responsive fixture</h1>${body}</main></body></html>`;
const audit = (html: string, hasViewportMeta = true) => analyzeMobileSafe({ html, finalUrl: "https://example.com/responsive", hasViewportMeta }, { resolver: publicResolver, renderingGraceMs: 0 });

test("responsive page fits all viewports and scores strongly", async () => {
  const html = page("<p>Readable responsive content.</p><button type='button'>Continue</button>");
  const response = await audit(html);
  assert.equal(response.available, true, JSON.stringify(response));
  if (response.available) {
    assert.ok(response.result.score >= 95, `received ${response.result.score}`);
    assert.equal(response.result.viewports.length, 4);
    assert.equal(response.result.viewports.some((item) => item.horizontalOverflow), false);
    assert.equal(response.result.metadata.screenshotsCaptured, 3);
    assert.equal(response.result.metadata.screenshotsPersisted, false);
  }
});

test("detects fixed-width horizontal overflow", async () => {
  const response = await audit(page("<div class='wide'>Wide content</div>", ".wide{width:700px;height:40px}"));
  assert.equal(response.available, true);
  if (response.available) {
    assert.equal(response.result.viewports.find((item) => item.width === 375)?.horizontalOverflow, true);
    assert.ok(response.result.findings.some((item) => item.id === "mobile-horizontal-overflow"));
    assert.ok(response.result.findings.some((item) => item.id === "mobile-fixed-width"));
  }
});

test("detects oversized rendered media without downloading it", async () => {
  const response = await audit(page("<img class='hero' src='https://example.com/large.jpg' alt='Hero'>", ".hero{display:block;width:800px;height:120px}"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.findings.some((item) => item.id === "mobile-oversized-media"));
});

test("detects clearly small tap targets", async () => {
  const response = await audit(page("<button class='tiny' type='button' aria-label='Close'>×</button>", ".tiny{width:12px;height:12px;min-height:0;padding:0;border:0}"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.findings.some((item) => item.id === "mobile-small-targets"));
});

test("detects clearly tiny visible text", async () => {
  const response = await audit(page("<p class='tiny-text'>Important but tiny information</p>", ".tiny-text{font-size:8px}"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.findings.some((item) => item.id === "mobile-tiny-text"));
});

test("detects a large fixed overlay", async () => {
  const response = await audit(page("<aside class='overlay'>Large fixed notice</aside>", ".overlay{position:fixed;left:0;bottom:0;width:100vw;height:45vh;background:white;z-index:10}"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.findings.some((item) => item.id === "mobile-fixed-overlay"));
});

test("working responsive navigation avoids navigation findings", async () => {
  const response = await audit(page("<p>Content</p>", "@media(max-width:500px){nav{flex-direction:column}nav a{width:100%}}"));
  assert.equal(response.available, true);
  if (response.available) assert.equal(response.result.findings.some((item) => item.id === "mobile-mobile-navigation"), false);
});

test("detects form controls extending beyond mobile viewport", async () => {
  const response = await audit(page("<label for='name'>Name</label><input id='name' class='wide-input'>", ".wide-input{display:block;width:600px}"));
  assert.equal(response.available, true);
  if (response.available) assert.ok(response.result.findings.some((item) => item.id === "mobile-form-usability"));
});

test("repeated issues are counted but evidence remains capped", async () => {
  const buttons = Array.from({ length: 20 }, (_, index) => `<button class='tiny' aria-label='Item ${index}'>${index}</button>`).join("");
  const response = await audit(page(buttons, ".tiny{width:10px;height:10px;min-height:0;padding:0}"));
  assert.equal(response.available, true);
  if (response.available) {
    const finding = response.result.findings.find((item) => item.id === "mobile-small-targets");
    assert.ok(response.result.summary.smallTapTargets >= 20);
    assert.ok((finding?.evidence.length || 0) <= 5);
    assert.ok(response.result.findings.length <= 12);
  }
});

test("missing viewport metadata affects the real score without duplicate DOM analysis", async () => {
  const response = await audit(page("<p>Content</p>"), false);
  assert.equal(response.available, true);
  if (response.available) {
    assert.ok(response.result.findings.some((item) => item.id === "mobile-viewport-meta"));
    assert.ok(response.result.score <= 85);
  }
});

test("private target is blocked before browser launch", async () => {
  let launched = false;
  const response = await analyzeMobileSafe({ html: page(""), finalUrl: "http://127.0.0.1/", hasViewportMeta: true }, { launch: (async () => { launched = true; throw new Error("must not launch"); }) as BrowserLauncher });
  assert.equal(response.available, false);
  if (!response.available) assert.equal(response.error.code, "UNSAFE_NAVIGATION_BLOCKED");
  assert.equal(launched, false);
});
