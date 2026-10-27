import assert from "node:assert/strict";
import test from "node:test";
import { calculateMobileScore } from "../lib/auditor/mobile/mobile-score";
import type { MobileViewportResult } from "../lib/auditor/mobile/mobile-types";

function viewport(overrides: Partial<MobileViewportResult> = {}): MobileViewportResult {
  return {
    id: "mobile-small", name: "Mobile small", width: 375, height: 667, kind: "mobile", captureScreenshot: true,
    documentWidth: 375, horizontalOverflow: false, overflowPixels: 0, renderDurationMs: 1,
    counts: { outsideViewport: 0, oversizedMedia: 0, fixedWidth: 0, tinyText: 0, smallTapTargets: 0, tightTapSpacing: 0, clipped: 0, navigation: 0, form: 0, overlays: 0 },
    evidence: { "outside-viewport": [], "oversized-media": [], "fixed-width": [], "tiny-text": [], "small-targets": [], "target-spacing": [], "content-clipping": [], "mobile-navigation": [], "form-usability": [], "fixed-overlay": [] },
    ...overrides,
  };
}

test("mobile scoring is deterministic and rewards a clean responsive page", () => {
  const input = { hasViewportMeta: true, viewports: [viewport()] };
  assert.equal(calculateMobileScore(input), 100);
  assert.equal(calculateMobileScore(input), calculateMobileScore(input));
});

test("missing viewport metadata and overflow receive meaningful deductions", () => {
  const overflowing = viewport({ horizontalOverflow: true, documentWidth: 700, overflowPixels: 325, counts: { ...viewport().counts, outsideViewport: 3, fixedWidth: 1 } });
  const score = calculateMobileScore({ hasViewportMeta: false, viewports: [overflowing] });
  assert.ok(score <= 65, `received ${score}`);
});

test("repeated node penalties are capped and desktop reference does not affect the mobile score", () => {
  const repeated = viewport({ counts: { ...viewport().counts, smallTapTargets: 1_000, tinyText: 1_000 } });
  const desktop = viewport({ id: "desktop", name: "Desktop", width: 1440, height: 900, kind: "desktop", horizontalOverflow: true, counts: { ...viewport().counts, overlays: 100 } });
  const withDesktop = calculateMobileScore({ hasViewportMeta: true, viewports: [repeated, desktop] });
  const withoutDesktop = calculateMobileScore({ hasViewportMeta: true, viewports: [repeated] });
  assert.equal(withDesktop, withoutDesktop);
  assert.ok(withDesktop > 80);
});
