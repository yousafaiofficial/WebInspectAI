import type { SeoRuleId } from "./seo-types";

export const SEO_RULES: Record<SeoRuleId, { title: string; weight: number }> = {
  title: { title: "Page title", weight: 15 },
  "meta-description": { title: "Meta description", weight: 12 },
  canonical: { title: "Canonical URL", weight: 8 },
  robots: { title: "Indexing directives", weight: 12 },
  "html-language": { title: "Document language", weight: 4 },
  h1: { title: "Primary heading", weight: 10 },
  "heading-order": { title: "Heading order", weight: 3 },
  "image-alt": { title: "Image alternative text", weight: 8 },
  "open-graph": { title: "Open Graph metadata", weight: 3 },
  "twitter-card": { title: "X/Twitter card metadata", weight: 2 },
  viewport: { title: "Mobile viewport", weight: 6 },
  charset: { title: "Character encoding", weight: 3 },
  favicon: { title: "Favicon", weight: 1 },
  "structured-data": { title: "Structured data", weight: 4 },
  links: { title: "Page links", weight: 2 },
  url: { title: "Page URL", weight: 7 },
};

export const SEO_LIMITS = {
  evidence: 5,
  structuredDataTypes: 10,
  shortTitle: 20,
  recommendedTitleMin: 30,
  longTitle: 60,
  shortDescription: 70,
  longDescription: 160,
  longUrl: 120,
  veryLongUrl: 200,
  manyQueryParameters: 5,
} as const;
