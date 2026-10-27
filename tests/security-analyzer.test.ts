import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSecurity } from "../lib/auditor/security/analyze-security";
import { calculateSecurityScore, securityScoreImpact } from "../lib/auditor/security/security-score";
import type { NormalizedResponseHeaders } from "../lib/fetcher/safe-request";

const analyze = (headers: NormalizedResponseHeaders, finalUrl = "https://example.com/") => analyzeSecurity({ headers, finalUrl });
const rule = (result: ReturnType<typeof analyze>, id: string) => result.checks.find((item) => item.id === id)!;

test("strong response headers produce a strong score and parsed metadata", () => {
  const result = analyze({
    "strict-transport-security": ["max-age=31536000; includeSubDomains; preload"],
    "content-security-policy": ["default-src 'self'; frame-ancestors 'none'; object-src 'none'"],
    "x-content-type-options": ["nosniff"], "referrer-policy": ["strict-origin-when-cross-origin"],
    "permissions-policy": ["camera=(), microphone=()"], "cross-origin-opener-policy": ["same-origin"],
  });
  assert.ok(result.score >= 90, `received ${result.score}`);
  assert.equal(result.headers.hsts?.maxAge, 31536000);
  assert.equal(result.headers.hsts?.includeSubDomains, true);
  assert.equal(result.headers.hsts?.preload, true);
  assert.equal(result.headers.csp?.hasFrameAncestors, true);
  assert.equal(rule(result, "framing").status, "passed");
});

test("HTTP is a critical transport issue and HSTS is not double-penalized", () => {
  const result = analyze({}, "http://example.com/");
  assert.equal(rule(result, "https").severity, "critical");
  assert.equal(rule(result, "hsts").status, "not_applicable");
  assert.equal(rule(result, "hsts").scoreImpact, 0);
});

test("HSTS with max-age zero is detected but not treated as active protection", () => {
  const result = analyze({ "strict-transport-security": ["max-age=0"] });
  assert.equal(result.headers.hsts?.maxAge, 0);
  assert.equal(rule(result, "hsts").status, "warning");
});

test("distinguishes report-only CSP and detects unsafe directives", () => {
  const result = analyze({ "content-security-policy-report-only": ["default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval'"] });
  assert.equal(result.headers.csp?.reportOnly, true);
  assert.equal(result.headers.csp?.unsafeInline, true);
  assert.equal(result.headers.csp?.unsafeEval, true);
  assert.equal(rule(result, "csp").status, "warning");
});

test("CSP frame-ancestors satisfies framing control without X-Frame-Options", () => {
  const result = analyze({ "content-security-policy": ["default-src 'self'; frame-ancestors 'self'"] });
  assert.equal(rule(result, "framing").status, "passed");
  assert.equal(rule(result, "framing").scoreImpact, 0);
});

test("preserves repeated Set-Cookie headers and reviews flags by cookie", () => {
  const result = analyze({ "set-cookie": ["session=secret; Secure; HttpOnly; SameSite=Lax", "theme=dark; Secure; SameSite=Lax"] });
  assert.deepEqual(result.cookies, { count: 2, secure: 2, httpOnly: 1, sameSite: 2, examples: ["session: secure, httponly, samesite=lax", "theme: secure, samesite=lax"] });
  assert.equal(rule(result, "cookies").status, "warning");
  assert.doesNotMatch(JSON.stringify(result.cookies), /secret/);
});

test("missing advanced headers does not collapse an otherwise HTTPS score", () => {
  const result = analyze({});
  assert.ok(result.score >= 60, `expected a respectable baseline, received ${result.score}`);
  assert.equal(rule(result, "permissions-policy").status, "info");
  assert.equal(rule(result, "cross-origin").status, "info");
});

test("software disclosure remains informational", () => {
  const result = analyze({ server: ["ExampleServer"], "x-powered-by": ["Framework"] });
  assert.equal(rule(result, "server-disclosure").status, "info");
  assert.equal(rule(result, "server-disclosure").severity, "improvement");
});

test("security score weights are centralized and bounded", () => {
  assert.equal(securityScoreImpact("https", "failed"), 20);
  assert.equal(calculateSecurityScore([{ scoreImpact: 20 }, { scoreImpact: 9 }]), 71);
  assert.equal(calculateSecurityScore([{ scoreImpact: 200 }]), 0);
});
