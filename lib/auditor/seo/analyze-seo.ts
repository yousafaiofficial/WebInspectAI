import "server-only";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { IssueSeverity } from "../../audit-types";
import { SEO_LIMITS, SEO_RULES } from "./seo-rules";
import { calculateSeoScore, scoreImpact } from "./seo-score";
import type { SeoAuditInput, SeoAuditResult, SeoCheck, SeoCheckStatus, SeoRuleId } from "./seo-types";

type CheckInput = Omit<SeoCheck, "title" | "weight" | "scoreImpact"> & { id: SeoRuleId };

function check(input: CheckInput): SeoCheck {
  const rule = SEO_RULES[input.id];
  return { ...input, title: rule.title, weight: rule.weight, scoreImpact: scoreImpact(input.id, input.status) };
}

function outcome(status: SeoCheckStatus): IssueSeverity {
  if (status === "passed") return "passed";
  return status === "failed" ? "important" : "improvement";
}

function clean(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function capped(values: string[]) {
  return values.filter(Boolean).slice(0, SEO_LIMITS.evidence);
}

function metaContent($: cheerio.CheerioAPI, attribute: "name" | "property", value: string) {
  let result = "";
  $("meta").each((_, element) => {
    if (!result && clean($(element).attr(attribute)).toLowerCase() === value) result = clean($(element).attr("content"));
  });
  return result;
}

function structuredTypes(value: unknown, target: Set<string>) {
  if (!value || target.size >= SEO_LIMITS.structuredDataTypes) return;
  if (Array.isArray(value)) {
    value.forEach((item) => structuredTypes(item, target));
    return;
  }
  if (typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (typeof type === "string") target.add(type);
  else if (Array.isArray(type)) type.filter((item): item is string => typeof item === "string").forEach((item) => target.add(item));
  if (record["@graph"]) structuredTypes(record["@graph"], target);
}

export function analyzeSeo(input: SeoAuditInput): SeoAuditResult {
  const started = performance.now();
  const $ = cheerio.load(input.html);
  const pageUrl = new URL(input.finalUrl);
  const checks: SeoCheck[] = [];

  const titleElements = $("title");
  const title = clean(titleElements.first().text());
  const titleLength = title.length;
  let titleStatus: SeoCheckStatus = "passed";
  let titleDescription = `The page title is ${titleLength} characters long.`;
  let titleRecommendation = "No change is necessary. Keep the title specific to this page.";
  let titleSeverity: IssueSeverity = "passed";
  if (!titleElements.length || !title) {
    titleStatus = "failed"; titleSeverity = "critical";
    titleDescription = titleElements.length ? "The title element is empty." : "The page does not contain a title element.";
    titleRecommendation = "Add a unique, descriptive page title that explains the page’s primary topic.";
  } else if (titleLength < SEO_LIMITS.shortTitle) {
    titleStatus = "warning"; titleSeverity = "improvement";
    titleDescription = `The ${titleLength}-character title is unusually short.`;
    titleRecommendation = "Consider a more descriptive title. A practical heuristic is roughly 30–60 characters, not a search-engine guarantee.";
  } else if (titleLength > SEO_LIMITS.longTitle) {
    titleStatus = "warning"; titleSeverity = "improvement";
    titleDescription = `The ${titleLength}-character title may be truncated in some search displays.`;
    titleRecommendation = "Consider making the title more concise while preserving its meaning; roughly 30–60 characters is a common heuristic.";
  }
  checks.push(check({ id: "title", status: titleStatus, severity: titleSeverity, description: titleDescription, evidence: title ? [title] : [], recommendation: titleRecommendation }));

  const descriptionElements = $("meta").filter((_, el) => clean($(el).attr("name")).toLowerCase() === "description");
  const description = clean(descriptionElements.first().attr("content"));
  const descriptionLength = description.length;
  let descriptionStatus: SeoCheckStatus = "passed";
  let descriptionText = `The meta description is ${descriptionLength} characters long.`;
  let descriptionRecommendation = "No change is necessary. Keep the description relevant to this page.";
  if (!descriptionElements.length || !description) {
    descriptionStatus = "failed";
    descriptionText = descriptionElements.length ? "The meta description is empty." : "The page has no meta description.";
    descriptionRecommendation = "Add a concise, page-specific summary that can help searchers understand the result.";
  } else if (descriptionLength < SEO_LIMITS.shortDescription) {
    descriptionStatus = "warning"; descriptionText = `The ${descriptionLength}-character meta description is quite short.`;
    descriptionRecommendation = "Consider adding useful context while keeping the description concise and specific.";
  } else if (descriptionLength > SEO_LIMITS.longDescription) {
    descriptionStatus = "warning"; descriptionText = `The ${descriptionLength}-character meta description may be truncated in search displays.`;
    descriptionRecommendation = "Consider shortening the description to its most useful message; length guidance is heuristic, not guaranteed.";
  }
  checks.push(check({ id: "meta-description", status: descriptionStatus, severity: descriptionStatus === "failed" ? "important" : outcome(descriptionStatus), description: descriptionText, evidence: description ? [description] : [], recommendation: descriptionRecommendation }));

  const canonicalElements = $("link").filter((_, el) => clean($(el).attr("rel")).toLowerCase().split(/\s+/).includes("canonical"));
  const canonicalRaw = clean(canonicalElements.first().attr("href"));
  let canonical: string | undefined;
  let canonicalCrossOrigin = false;
  let canonicalStatus: SeoCheckStatus = "passed";
  let canonicalDescription = "A valid canonical URL points to this origin.";
  let canonicalRecommendation = "No change is necessary.";
  if (!canonicalElements.length || !canonicalRaw) {
    canonicalStatus = "warning"; canonicalDescription = canonicalElements.length ? "The canonical link has an empty href." : "No canonical link was found.";
    canonicalRecommendation = "Add a canonical URL when duplicate or alternate page URLs could be discovered.";
  } else {
    try {
      canonical = new URL(canonicalRaw, pageUrl).toString();
      canonicalCrossOrigin = new URL(canonical).origin !== pageUrl.origin;
      if (canonicalElements.length > 1) {
        canonicalStatus = "warning"; canonicalDescription = `${canonicalElements.length} canonical links were found, which creates ambiguity.`;
        canonicalRecommendation = "Keep one canonical link that represents the preferred page URL.";
      } else if (canonicalCrossOrigin) {
        canonicalStatus = "warning"; canonicalDescription = "The canonical points to a different origin. This can be intentional, but should be reviewed.";
        canonicalRecommendation = "Confirm that the cross-domain canonical accurately identifies the preferred version of this content.";
      }
    } catch {
      canonicalStatus = "failed"; canonicalDescription = "The canonical href could not be resolved as a valid URL.";
      canonicalRecommendation = "Replace it with a valid absolute or relative HTTP(S) URL.";
    }
  }
  checks.push(check({ id: "canonical", status: canonicalStatus, severity: outcome(canonicalStatus), description: canonicalDescription, evidence: capped(canonicalElements.map((_, el) => clean($(el).attr("href"))).get()), recommendation: canonicalRecommendation }));

  const robotsValues = $("meta").filter((_, el) => clean($(el).attr("name")).toLowerCase() === "robots").map((_, el) => clean($(el).attr("content"))).get().filter(Boolean);
  const robots = Array.from(new Set(robotsValues.flatMap((value) => value.toLowerCase().split(/[\s,]+/).filter(Boolean))));
  const noindex = robots.includes("noindex");
  const nofollow = robots.includes("nofollow");
  checks.push(check({
    id: "robots", status: noindex ? "failed" : nofollow ? "warning" : "passed", severity: noindex ? "important" : nofollow ? "improvement" : "passed",
    description: noindex ? `The page instructs search engines not to index it${nofollow ? " and not to follow its links" : ""}. This may be intentional.` : nofollow ? "The page asks search engines not to follow its links. This may be intentional." : robots.length ? "No restrictive indexing directive was detected." : "No robots meta restriction was detected.",
    evidence: robots, recommendation: noindex || nofollow ? "Confirm these directives match the intended search visibility for this page." : "No change is necessary.",
  }));

  const language = clean($("html").first().attr("lang"));
  checks.push(check({ id: "html-language", status: language ? "passed" : "warning", severity: language ? "passed" : "improvement", description: language ? `The document language is set to “${language}”.` : "The root HTML element has no language value.", evidence: language ? [language] : [], recommendation: language ? "No change is necessary." : "Set a valid lang value on the root HTML element." }));

  const headings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, jumps: 0 };
  let previousLevel = 0;
  $("h1,h2,h3,h4,h5,h6").each((_, element) => {
    const level = Number(element.tagName.slice(1));
    headings[`h${level}` as keyof Omit<typeof headings, "jumps">] += 1;
    if (previousLevel && level > previousLevel + 1) headings.jumps += 1;
    previousLevel = level;
  });
  const h1Status: SeoCheckStatus = headings.h1 === 1 ? "passed" : headings.h1 === 0 ? "failed" : "warning";
  checks.push(check({ id: "h1", status: h1Status, severity: headings.h1 === 0 ? "important" : outcome(h1Status), description: headings.h1 === 1 ? "The page has one primary H1 heading." : headings.h1 === 0 ? "The page has no H1 heading." : `The page has ${headings.h1} H1 headings. Multiple H1s can be valid, but deserve a structure review.`, evidence: capped($("h1").map((_, el) => clean($(el).text())).get()), recommendation: headings.h1 === 1 ? "No change is necessary." : "Use headings to communicate a clear page outline and primary topic." }));
  checks.push(check({ id: "heading-order", status: headings.jumps ? "warning" : "passed", severity: headings.jumps ? "improvement" : "passed", description: headings.jumps ? `${headings.jumps} obvious heading-level jump${headings.jumps === 1 ? " was" : "s were"} detected.` : "No obvious heading-level jumps were detected.", evidence: headings.jumps ? [`${headings.jumps} level jump(s)`] : [], recommendation: headings.jumps ? "Review the outline and avoid skipping heading levels where it obscures content hierarchy." : "No change is necessary." }));

  const images = { total: 0, withAlt: 0, missingAlt: 0, emptyAlt: 0, missingAltExamples: [] as string[] };
  $("img").each((_, element) => {
    images.total += 1;
    const alt = $(element).attr("alt");
    if (alt === undefined) {
      images.missingAlt += 1;
      if (images.missingAltExamples.length < SEO_LIMITS.evidence) images.missingAltExamples.push(clean($(element).attr("src")) || "Image without src");
    } else {
      images.withAlt += 1;
      if (!alt.trim()) images.emptyAlt += 1;
    }
  });
  const imageStatus: SeoCheckStatus = images.missingAlt ? "warning" : "passed";
  checks.push(check({ id: "image-alt", status: imageStatus, severity: outcome(imageStatus), description: images.missingAlt ? `${images.missingAlt} of ${images.total} images are missing an alt attribute. ${images.emptyAlt} use an empty alt value, which can be correct for decorative images.` : `${images.total} images were found; none are missing the alt attribute. ${images.emptyAlt} use an empty decorative alt value.`, evidence: images.missingAltExamples, recommendation: images.missingAlt ? "Add useful alternative text to meaningful images. Keep alt empty only when an image is genuinely decorative." : "Review empty alt values periodically to ensure those images are decorative." }));

  const ogFields = ["og:title", "og:description", "og:image", "og:url", "og:type"];
  const openGraph: Record<string, string> = {};
  ogFields.forEach((field) => { const value = metaContent($, "property", field); if (value) openGraph[field] = value; });
  const missingOg = ogFields.filter((field) => !openGraph[field]);
  checks.push(check({ id: "open-graph", status: missingOg.length ? "info" : "passed", severity: missingOg.length ? "improvement" : "passed", description: missingOg.length ? `${missingOg.length} common Open Graph field(s) are missing. These affect social previews more than core rankings.` : "Common Open Graph fields are present.", evidence: capped(missingOg.map((field) => `Missing ${field}`)), recommendation: missingOg.length ? "Add the fields needed for reliable social sharing previews." : "No change is necessary." }));

  const twitterFields = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];
  const twitter: Record<string, string> = {};
  twitterFields.forEach((field) => { const value = metaContent($, "name", field); if (value) twitter[field] = value; });
  const missingTwitter = twitterFields.filter((field) => !twitter[field]);
  checks.push(check({ id: "twitter-card", status: missingTwitter.length ? "info" : "passed", severity: missingTwitter.length ? "improvement" : "passed", description: missingTwitter.length ? `${missingTwitter.length} common X/Twitter card field(s) are missing.` : "Common X/Twitter card fields are present.", evidence: capped(missingTwitter.map((field) => `Missing ${field}`)), recommendation: missingTwitter.length ? "Add card metadata if social sharing previews matter for this page." : "No change is necessary." }));

  const viewport = metaContent($, "name", "viewport");
  checks.push(check({ id: "viewport", status: viewport ? "passed" : "failed", severity: viewport ? "passed" : "important", description: viewport ? "A mobile viewport declaration is present." : "No viewport meta tag was found.", evidence: viewport ? [viewport] : [], recommendation: viewport ? "No change is necessary." : "Add a responsive viewport declaration, typically width=device-width, initial-scale=1." }));

  let charset = clean($("meta[charset]").first().attr("charset"));
  if (!charset) {
    $("meta").each((_, el) => {
      if (charset || clean($(el).attr("http-equiv")).toLowerCase() !== "content-type") return;
      const match = clean($(el).attr("content")).match(/charset\s*=\s*([^;\s]+)/i);
      if (match) charset = match[1];
    });
  }
  checks.push(check({ id: "charset", status: charset ? "passed" : "warning", severity: charset ? "passed" : "improvement", description: charset ? `The declared character encoding is ${charset}.` : "No HTML character encoding declaration was detected.", evidence: charset ? [charset] : [], recommendation: charset ? "No change is necessary." : "Declare UTF-8 near the beginning of the document head." }));

  const favicon = $("link").filter((_, el) => clean($(el).attr("rel")).toLowerCase().split(/\s+/).some((token) => token === "icon" || token === "shortcut" || token === "apple-touch-icon")).first();
  checks.push(check({ id: "favicon", status: favicon.length ? "passed" : "info", severity: favicon.length ? "passed" : "improvement", description: favicon.length ? "A favicon declaration was found." : "No common favicon declaration was found.", evidence: favicon.length ? capped([clean(favicon.attr("href"))]) : [], recommendation: favicon.length ? "No change is necessary." : "Add a favicon to reinforce recognition in browser tabs and bookmarks." }));

  const jsonLdElements = $('script[type="application/ld+json" i]');
  let validBlocks = 0;
  let invalidBlocks = 0;
  const typeSet = new Set<string>();
  jsonLdElements.each((_, el) => {
    try { structuredTypes(JSON.parse($(el).text()), typeSet); validBlocks += 1; } catch { invalidBlocks += 1; }
  });
  const structuredData = { blocks: jsonLdElements.length, validBlocks, invalidBlocks, types: Array.from(typeSet).slice(0, SEO_LIMITS.structuredDataTypes) };
  const structuredStatus: SeoCheckStatus = invalidBlocks ? "warning" : jsonLdElements.length ? "passed" : "info";
  checks.push(check({ id: "structured-data", status: structuredStatus, severity: outcome(structuredStatus), description: invalidBlocks ? `${invalidBlocks} of ${jsonLdElements.length} JSON-LD blocks could not be parsed.` : jsonLdElements.length ? `${jsonLdElements.length} valid JSON-LD block(s) were found.` : "No JSON-LD structured data was found. It is useful for eligible content, but not required on every page.", evidence: structuredData.types, recommendation: invalidBlocks ? "Fix malformed JSON-LD syntax, then validate the relevant schema separately." : jsonLdElements.length ? "Keep structured data accurate and aligned with visible content." : "Consider relevant structured data only when it accurately describes the page." }));

  const links = { total: 0, internal: 0, external: 0, empty: 0, hashOnly: 0, mailto: 0, tel: 0 };
  $("a").each((_, element) => {
    links.total += 1;
    const href = clean($(element).attr("href"));
    if (!href) { links.empty += 1; return; }
    if (href.startsWith("#")) { links.hashOnly += 1; return; }
    if (href.toLowerCase().startsWith("mailto:")) { links.mailto += 1; return; }
    if (href.toLowerCase().startsWith("tel:")) { links.tel += 1; return; }
    try {
      const target = new URL(href, pageUrl);
      if (target.protocol === "http:" || target.protocol === "https:") target.origin === pageUrl.origin ? links.internal += 1 : links.external += 1;
    } catch { links.empty += 1; }
  });
  checks.push(check({ id: "links", status: links.empty ? "warning" : "passed", severity: links.empty ? "improvement" : "passed", description: links.empty ? `${links.empty} of ${links.total} links have an empty or unusable href.` : `${links.total} links were categorized without empty hrefs.`, evidence: links.empty ? [`${links.empty} empty or invalid href(s)`] : [], recommendation: links.empty ? "Give interactive links a meaningful destination, or use buttons for actions without navigation." : "No change is necessary. Link destinations were not crawled in this audit." }));

  const urlConcerns: string[] = [];
  let urlStatus: SeoCheckStatus = "passed";
  if (pageUrl.protocol !== "https:") { urlConcerns.push("Page uses HTTP rather than HTTPS"); urlStatus = "warning"; }
  if (input.finalUrl.length > SEO_LIMITS.veryLongUrl) { urlConcerns.push(`URL is ${input.finalUrl.length} characters long`); urlStatus = "warning"; }
  else if (input.finalUrl.length > SEO_LIMITS.longUrl) { urlConcerns.push(`URL is ${input.finalUrl.length} characters long`); urlStatus = "info"; }
  if (pageUrl.searchParams.size > SEO_LIMITS.manyQueryParameters) { urlConcerns.push("URL has many query parameters"); urlStatus = urlStatus === "passed" ? "info" : urlStatus; }
  if (pageUrl.hash) { urlConcerns.push("URL contains a fragment"); urlStatus = urlStatus === "passed" ? "info" : urlStatus; }
  checks.push(check({ id: "url", status: urlStatus, severity: outcome(urlStatus), description: urlConcerns.length ? "The page URL has characteristics worth reviewing." : "The page uses HTTPS and has a straightforward URL.", evidence: capped(urlConcerns), recommendation: urlConcerns.length ? "Prefer HTTPS and concise, stable URLs where practical. Query parameters can be valid and are not inherently harmful." : "No change is necessary." }));

  const score = calculateSeoScore(checks);
  return {
    score,
    analysisDurationMs: Math.round((performance.now() - started) * 100) / 100,
    summary: {
      passed: checks.filter((item) => item.status === "passed").length,
      warnings: checks.filter((item) => item.status === "warning" || item.status === "info").length,
      important: checks.filter((item) => item.severity === "critical" || item.severity === "important").length,
    },
    metadata: { title: title || undefined, titleLength, description: description || undefined, descriptionLength, canonical, canonicalIsCrossOrigin: canonicalCrossOrigin, language: language || undefined, robots, viewport: viewport || undefined, charset: charset || undefined, openGraph, twitter },
    headings,
    images,
    links,
    structuredData,
    checks,
  };
}
