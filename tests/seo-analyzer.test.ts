import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSeo } from "../lib/auditor/seo/analyze-seo";
import { calculateSeoScore, scoreImpact } from "../lib/auditor/seo/seo-score";

const finalUrl = "https://example.com/products/widget";
const base = (html: string) => analyzeSeo({ html, finalUrl, status: 200, contentType: "text/html" });
const rule = (result: ReturnType<typeof base>, id: string) => result.checks.find((item) => item.id === id)!;

const strongHtml = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Technical Website Auditing for Better Search Results</title>
  <meta name="description" content="Review technical website signals with a clear, practical report that helps your team improve search visibility and visitor experience efficiently.">
  <link rel="canonical" href="/products/widget"><link rel="icon" href="/favicon.ico">
  <meta property="og:title" content="Website audit"><meta property="og:description" content="Audit description"><meta property="og:image" content="/share.jpg"><meta property="og:url" content="${finalUrl}"><meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Website audit"><meta name="twitter:description" content="Audit description"><meta name="twitter:image" content="/share.jpg">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
</head><body><h1>Technical Website Auditing</h1><h2>What the report covers</h2><img src="audit.png" alt="Example website audit report"><a href="/about">About</a></body></html>`;

test("a well-formed, metadata-rich page earns a strong deterministic score", () => {
  const result = base(strongHtml);
  assert.ok(result.score >= 90, `expected a strong score, received ${result.score}`);
  assert.equal(result.metadata.titleLength, 52);
  assert.equal(result.structuredData.validBlocks, 1);
  assert.deepEqual(result.structuredData.types, ["WebPage"]);
  assert.equal(result.summary.important, 0);
});

test("missing title produces a critical finding and score deduction", () => {
  const result = base("<html lang=en><head><meta name=description content='A useful description for this page that contains enough detail to explain the content clearly to potential visitors.'></head><body><h1>Page</h1></body></html>");
  assert.equal(rule(result, "title").severity, "critical");
  assert.equal(rule(result, "title").status, "failed");
  assert.ok(result.score < base(strongHtml).score);
});

test("missing meta description produces an important finding", () => {
  const result = base("<html><head><title>A sufficiently descriptive page title for testing</title></head><body><h1>Page</h1></body></html>");
  assert.equal(rule(result, "meta-description").status, "failed");
  assert.equal(rule(result, "meta-description").severity, "important");
});

test("detects noindex without assuming the directive is accidental", () => {
  const result = base("<html><head><meta name=robots content='noindex, nofollow'></head></html>");
  assert.deepEqual(result.metadata.robots, ["noindex", "nofollow"]);
  assert.equal(rule(result, "robots").severity, "important");
  assert.match(rule(result, "robots").description, /may be intentional/i);
});

test("reports multiple H1 elements with measured severity", () => {
  const result = base("<h1>First</h1><h1>Second</h1>");
  assert.equal(result.headings.h1, 2);
  assert.equal(rule(result, "h1").status, "warning");
  assert.equal(rule(result, "h1").severity, "improvement");
});

test("distinguishes missing alt attributes from empty decorative alt", () => {
  const result = base("<img src='missing.jpg'><img src='decorative.svg' alt=''><img src='useful.jpg' alt='Useful image'>");
  assert.deepEqual(result.images, { total: 3, withAlt: 2, missingAlt: 1, emptyAlt: 1, missingAltExamples: ["missing.jpg"] });
});

test("resolves a relative canonical against the final page URL", () => {
  const result = base("<link rel=canonical href='../preferred'>");
  assert.equal(result.metadata.canonical, "https://example.com/preferred");
  assert.equal(result.metadata.canonicalIsCrossOrigin, false);
});

test("flags a cross-origin canonical for review without marking it invalid", () => {
  const result = base("<link rel=canonical href='https://publisher.example/article'>");
  assert.equal(result.metadata.canonicalIsCrossOrigin, true);
  assert.equal(rule(result, "canonical").status, "warning");
  assert.notEqual(rule(result, "canonical").severity, "critical");
  assert.match(rule(result, "canonical").description, /intentional/i);
});

test("malformed JSON-LD is reported without crashing", () => {
  const result = base("<script type='application/ld+json'>{broken json</script>");
  assert.equal(result.structuredData.invalidBlocks, 1);
  assert.equal(rule(result, "structured-data").status, "warning");
});

test("categorizes page links without requesting them", () => {
  const result = base(`<a href="/one">One</a><a href="https://example.com/two">Two</a><a href="https://other.example/">Other</a><a href="#section">Hash</a><a href="mailto:hi@example.com">Mail</a><a href="tel:123">Call</a><a href="">Empty</a>`);
  assert.deepEqual(result.links, { total: 7, internal: 2, external: 1, empty: 1, hashOnly: 1, mailto: 1, tel: 1 });
});

test("tolerates malformed HTML", () => {
  assert.doesNotThrow(() => base("<html><head><title>Broken<body><h1>Still parsed<div><img src=x>"));
  const result = base("<h1>One<h4>Jump");
  assert.equal(result.headings.jumps, 1);
});

test("large repeated pages retain counts while capping evidence and findings", () => {
  const html = `<html><body>${Array.from({ length: 2_000 }, (_, index) => `<img src="image-${index}.jpg">`).join("")}</body></html>`;
  const result = base(html);
  assert.equal(result.images.total, 2_000);
  assert.equal(result.images.missingAlt, 2_000);
  assert.equal(result.images.missingAltExamples.length, 5);
  assert.equal(result.checks.length, 16);
});

test("central score calculation is bounded and uses rule weights", () => {
  assert.equal(scoreImpact("title", "failed"), 15);
  assert.equal(calculateSeoScore([{ scoreImpact: 15 }, { scoreImpact: 12 }]), 73);
  assert.equal(calculateSeoScore([{ scoreImpact: 200 }]), 0);
});
