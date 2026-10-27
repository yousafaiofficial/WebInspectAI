import { AI_LIMITS } from "./ai-limits";
import type { AiAnalysisInput, AiEvidenceSources, EvidenceCatalogItem } from "./types";

function clean(value: string, maximum: number = AI_LIMITS.maximumShortText) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function publicPageUrl(value: string) {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function refPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "item";
}

export function buildAiAnalysisInput(sources: AiEvidenceSources): AiAnalysisInput {
  const url = new URL(sources.finalUrl);
  const evidenceCatalog: EvidenceCatalogItem[] = [];
  const add = (ref: string, label: string, value: string) => {
    if (evidenceCatalog.length < AI_LIMITS.maximumCatalogEntries) evidenceCatalog.push({ ref, label: clean(label), value: clean(value, AI_LIMITS.maximumLongText) });
  };

  add("seo.title", "Page title", sources.seo.metadata.title ? clean(sources.seo.metadata.title) : "Missing");
  add("seo.meta-description", "Meta description", sources.seo.metadata.description ? "Present" : "Missing");
  add("seo.h1", "H1 count", String(sources.seo.headings.h1));
  add("seo.language", "Document language", sources.seo.metadata.language || "Missing");
  add("seo.image-alt", "Images missing alt text", `${sources.seo.images.missingAlt} of ${sources.seo.images.total}`);
  add("links.broken-internal", "Broken internal links", String(sources.links.links.filter((link) => link.internal && ["broken", "server_error"].includes(link.status)).length));
  add("security.https", "HTTPS transport", sources.security.headers.https ? "Enabled" : "Not enabled");

  let performance: AiAnalysisInput["performance"];
  if (sources.performance.available) {
    const metrics: NonNullable<AiAnalysisInput["performance"]>["metrics"] = {};
    for (const [id, metric] of Object.entries(sources.performance.result.metrics)) {
      if (!metric) continue;
      metrics[id] = { value: metric.value, displayValue: clean(metric.displayValue), rating: metric.rating };
      add(`performance.${refPart(id)}`, metric.label, `${metric.displayValue} (${metric.rating})`);
    }
    add("performance.score", "Lighthouse performance score", `${sources.performance.result.score}/100`);
    performance = {
      score: sources.performance.result.score,
      metrics,
      opportunities: sources.performance.result.opportunities.slice(0, AI_LIMITS.maximumPerformanceOpportunities).map((item) => {
        add(`performance.opportunity.${refPart(item.id)}`, item.title, [item.savingsMs ? `${Math.round(item.savingsMs)} ms` : "", item.savingsBytes ? `${Math.round(item.savingsBytes / 1024)} KB` : ""].filter(Boolean).join(" / ") || "Optimization identified");
        return { id: clean(item.id, 80), title: clean(item.title), savingsMs: item.savingsMs, savingsBytes: item.savingsBytes };
      }),
    };
  }

  let mobile: AiAnalysisInput["mobile"];
  if (sources.mobile.available) {
    const summary = sources.mobile.result.summary;
    add("mobile.horizontal-overflow", "Viewports with horizontal overflow", String(summary.overflowIssues));
    add("mobile.small-tap-targets", "Small tap targets", String(summary.smallTapTargets));
    add("mobile.tiny-text", "Tiny text regions", String(summary.tinyTextIssues));
    add("mobile.clipped-content", "Clipped elements", String(summary.clippedElements));
    add("mobile.overlays", "Large overlays", String(summary.overlayIssues));
    mobile = {
      score: sources.mobile.result.score,
      summary: { overflowIssues: summary.overflowIssues, smallTapTargets: summary.smallTapTargets, tinyTextIssues: summary.tinyTextIssues, clippedElements: summary.clippedElements, overlayIssues: summary.overlayIssues },
      findings: sources.mobile.result.findings.slice(0, AI_LIMITS.maximumMobileFindings).map((item) => {
        add(`mobile.finding.${refPart(item.id)}`, item.title, item.evidence.slice(0, AI_LIMITS.maximumEvidenceExamples).map((value) => clean(value)).join("; ") || item.description);
        return { id: clean(item.id, 80), severity: item.severity, title: clean(item.title), viewports: item.viewports.slice(0, 4).map((value) => clean(value, 80)), evidence: item.evidence.slice(0, AI_LIMITS.maximumEvidenceExamples).map((value) => clean(value)) };
      }),
    };
  }

  let accessibility: AiAnalysisInput["accessibility"];
  if (sources.accessibility.available) {
    accessibility = {
      score: sources.accessibility.result.score,
      violations: sources.accessibility.result.violations.slice(0, AI_LIMITS.maximumAccessibilityIssues).map((item) => {
        const ref = `accessibility.violation.${refPart(item.id)}`;
        add(ref, item.help, `${item.affectedNodes} affected node${item.affectedNodes === 1 ? "" : "s"}; impact ${item.impact}`);
        return { id: clean(item.id, 80), impact: item.impact, help: clean(item.help), affectedNodes: item.affectedNodes, examples: item.examples.slice(0, AI_LIMITS.maximumEvidenceExamples).map((example) => clean(example.target)) };
      }),
    };
  }

  return {
    version: 1,
    page: {
      url: publicPageUrl(sources.finalUrl), hostname: url.hostname,
      title: sources.seo.metadata.title ? clean(sources.seo.metadata.title) : undefined,
      metaDescriptionPresent: Boolean(sources.seo.metadata.description), language: sources.seo.metadata.language ? clean(sources.seo.metadata.language, 40) : undefined,
      headings: { h1: sources.seo.headings.h1, h2: sources.seo.headings.h2, h3: sources.seo.headings.h3, jumps: sources.seo.headings.jumps },
      images: { total: sources.seo.images.total, missingAlt: sources.seo.images.missingAlt },
    },
    performance,
    mobile,
    accessibility,
    navigation: {
      brokenInternalLinks: sources.links.links.filter((link) => link.internal && ["broken", "server_error"].includes(link.status)).length,
      unavailableInternalLinks: sources.links.links.filter((link) => link.internal && ["unavailable", "blocked"].includes(link.status)).length,
    },
    trust: { usesHttps: sources.security.headers.https },
    evidenceCatalog,
  };
}
