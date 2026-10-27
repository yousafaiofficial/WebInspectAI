import type { IssueSeverity } from "../../audit-types";

export type SeoRuleId =
  | "title"
  | "meta-description"
  | "canonical"
  | "robots"
  | "html-language"
  | "h1"
  | "heading-order"
  | "image-alt"
  | "open-graph"
  | "twitter-card"
  | "viewport"
  | "charset"
  | "favicon"
  | "structured-data"
  | "links"
  | "url";

export type SeoCheckStatus = "passed" | "warning" | "failed" | "info";

export type SeoCheck = {
  id: SeoRuleId;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: SeoCheckStatus;
  evidence: string[];
  recommendation: string;
  weight: number;
  scoreImpact: number;
};

export type SeoAuditInput = {
  html: string;
  finalUrl: string;
  status: number;
  contentType: string;
};

export type SeoAuditResult = {
  score: number;
  analysisDurationMs: number;
  summary: { passed: number; warnings: number; important: number };
  metadata: {
    title?: string;
    titleLength: number;
    description?: string;
    descriptionLength: number;
    canonical?: string;
    canonicalIsCrossOrigin: boolean;
    language?: string;
    robots: string[];
    viewport?: string;
    charset?: string;
    openGraph: Record<string, string>;
    twitter: Record<string, string>;
  };
  headings: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number; jumps: number };
  images: { total: number; withAlt: number; missingAlt: number; emptyAlt: number; missingAltExamples: string[] };
  links: { total: number; internal: number; external: number; empty: number; hashOnly: number; mailto: number; tel: number };
  structuredData: { blocks: number; validBlocks: number; invalidBlocks: number; types: string[] };
  checks: SeoCheck[];
};
