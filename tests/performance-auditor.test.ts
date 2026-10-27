import assert from "node:assert/strict";
import test from "node:test";
import { analyzePerformance, extractOpportunities, normalizeLighthouseResult } from "../lib/auditor/performance/analyze-performance";
import { PerformanceAuditError } from "../lib/auditor/performance/lighthouse-errors";
import { runLighthouse } from "../lib/auditor/performance/lighthouse-runner";
import { lighthouseScoreToPercent } from "../lib/auditor/performance/performance-score";
import type { LighthouseResultLike } from "../lib/auditor/performance/performance-types";

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 as const }];

function result(overrides: Partial<LighthouseResultLike> = {}): LighthouseResultLike {
  return {
    lighthouseVersion: "13.5.0",
    finalDisplayedUrl: "https://example.com/",
    categories: { performance: { score: 0.91 } },
    audits: {
      "first-contentful-paint": { numericValue: 1_100 },
      "largest-contentful-paint": { numericValue: 2_000 },
      "speed-index": { numericValue: 2_300 },
      "total-blocking-time": { numericValue: 80 },
      "cumulative-layout-shift": { numericValue: 0.04 },
      interactive: { numericValue: 3_000 },
      "server-response-time": { numericValue: 320 },
      diagnostics: { details: { items: [{ totalByteWeight: 450_000, numRequests: 24 }] } },
    },
    ...overrides,
  };
}

test("strong Lighthouse result maps its score and good metrics", () => {
  const normalized = normalizeLighthouseResult(result(), { testedUrl: "https://example.com", durationMs: 1200 });
  assert.equal(normalized.score, 91);
  assert.equal(normalized.metrics.lcp?.rating, "good");
  assert.equal(normalized.metrics.tbt?.displayValue, "80 ms");
  assert.equal(normalized.metadata.profile, "Simulated mobile");
  assert.equal(normalized.findings[0].severity, "passed");
});

test("poor Lighthouse metrics create appropriately severe findings", () => {
  const lhr = result({ categories: { performance: { score: 0.22 } }, audits: {
    "largest-contentful-paint": { numericValue: 7_200 },
    "total-blocking-time": { numericValue: 1_500 },
    "cumulative-layout-shift": { numericValue: 0.4 },
  } });
  const normalized = normalizeLighthouseResult(lhr, { testedUrl: "https://example.com", durationMs: 20 });
  assert.equal(normalized.score, 22);
  assert.equal(normalized.metrics.lcp?.rating, "poor");
  assert.ok(normalized.findings.some((finding) => finding.id === "performance-lcp" && finding.severity === "critical"));
});

test("missing optional metric audits do not crash", () => {
  const normalized = normalizeLighthouseResult(result({ audits: {} }), { testedUrl: "https://example.com", durationMs: 1 });
  assert.deepEqual(normalized.metrics, {});
});

test("CLS remains a unitless score rather than milliseconds", () => {
  const normalized = normalizeLighthouseResult(result(), { testedUrl: "https://example.com", durationMs: 1 });
  assert.equal(normalized.metrics.cls?.unit, "score");
  assert.equal(normalized.metrics.cls?.displayValue, "0.04");
});

test("Lighthouse score conversion rounds 0.91 to 91", () => {
  assert.equal(lighthouseScoreToPercent(0.91), 91);
});

test("opportunities are sorted by comparable potential impact", () => {
  const opportunities = extractOpportunities({
    "unused-javascript": { title: "Unused JS", score: 0.2, details: { overallSavingsBytes: 100_000 } },
    "unused-css-rules": { title: "Unused CSS", score: 0.4, details: { overallSavingsBytes: 900_000 } },
    "render-blocking-resources": { title: "Render blocking", score: 0.5, details: { overallSavingsMs: 500 } },
  });
  assert.equal(opportunities[0].id, "unused-css-rules");
});

test("opportunity and finding caps are enforced", () => {
  const audits: NonNullable<LighthouseResultLike["audits"]> = {};
  const supported = ["render-blocking-insight", "render-blocking-resources", "unused-javascript", "unused-css-rules", "modern-image-formats", "uses-optimized-images", "uses-responsive-images", "uses-long-cache-ttl", "uses-text-compression", "dom-size-insight", "dom-size", "mainthread-work-breakdown", "bootup-time", "third-parties-insight", "third-party-summary"];
  supported.forEach((id, index) => { audits[id] = { title: id, score: 0, details: { overallSavingsBytes: (index + 1) * 100_000 } }; });
  audits["largest-contentful-paint"] = { numericValue: 8_000 };
  audits["total-blocking-time"] = { numericValue: 2_000 };
  audits["first-contentful-paint"] = { numericValue: 5_000 };
  const normalized = normalizeLighthouseResult(result({ audits }), { testedUrl: "https://example.com", durationMs: 1 });
  assert.equal(normalized.opportunities.length, 10);
  assert.equal(normalized.findings.length, 12);
});

test("invalid Lighthouse result raises a structured error", () => {
  assert.throws(() => normalizeLighthouseResult({ audits: {} }, { testedUrl: "https://example.com", durationMs: 1 }), (error) => error instanceof PerformanceAuditError && error.code === "INVALID_LIGHTHOUSE_RESULT");
});

test("timeout is sanitized and closes safety and Chrome", async () => {
  let browserStopped = 0;
  let safetyClosed = 0;
  await assert.rejects(runLighthouse("https://example.com", {
    resolver: publicResolver,
    totalTimeoutMs: 5,
    launchChrome: async () => ({ port: 1234, stop: async () => { browserStopped += 1; } }),
    attachSafety: async () => ({ getBlockedRequests: () => 0, getUnsafeNavigation: () => undefined, close: async () => { safetyClosed += 1; } }),
    executeLighthouse: async () => new Promise(() => undefined),
  }), (error) => error instanceof PerformanceAuditError && error.code === "AUDIT_TIMEOUT" && error.message === "The performance audit exceeded its time limit.");
  assert.equal(browserStopped, 1);
  assert.equal(safetyClosed, 1);
});

test("Chrome and safety connections are cleaned up on success and failure", async () => {
  for (const fails of [false, true]) {
    let stopped = 0;
    let closed = 0;
    const action = runLighthouse("https://example.com", {
      resolver: publicResolver,
      launchChrome: async () => ({ port: 1234, stop: async () => { stopped += 1; } }),
      attachSafety: async () => ({ getBlockedRequests: () => 0, getUnsafeNavigation: () => undefined, close: async () => { closed += 1; } }),
      executeLighthouse: async () => { if (fails) throw new Error("raw secret"); return result(); },
    });
    if (fails) await assert.rejects(action, (error) => error instanceof PerformanceAuditError && error.code === "LIGHTHOUSE_AUDIT_FAILED" && !error.message.includes("secret"));
    else await action;
    assert.equal(stopped, 1);
    assert.equal(closed, 1);
  }
});

test("private target is rejected before Chromium launch", async () => {
  let launched = false;
  await assert.rejects(analyzePerformance("http://127.0.0.1/admin", { launchChrome: async () => { launched = true; throw new Error("must not run"); } }), (error) => error instanceof PerformanceAuditError && error.code === "UNSAFE_NAVIGATION_BLOCKED");
  assert.equal(launched, false);
});
