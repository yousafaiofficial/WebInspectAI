import type { IssueSeverity } from "../../audit-types";

export type LinkStatus = "healthy" | "redirected" | "broken" | "server_error" | "restricted" | "unavailable" | "blocked" | "other";

export type ExtractedLinks = {
  anchors: number;
  httpLinks: Array<{ url: string; internal: boolean }>;
  hashOnly: number;
  empty: number;
  mailto: number;
  tel: number;
  unsupported: number;
};

export type LinkCheckResult = {
  url: string;
  internal: boolean;
  status: LinkStatus;
  httpStatus?: number;
  statusText?: string;
  finalUrl?: string;
  redirectCount: number;
  errorCode?: string;
};

export type LinkFinding = {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  evidence: string[];
  whyItMatters: string;
  recommendation: string;
};

export type LinkAuditResult = {
  score: number;
  summary: {
    anchors: number;
    httpDiscovered: number;
    checked: number;
    healthy: number;
    redirected: number;
    broken: number;
    serverErrors: number;
    restricted: number;
    unavailable: number;
    blocked: number;
    skippedDueToLimit: number;
    notCheckable: number;
  };
  classification: Pick<ExtractedLinks, "hashOnly" | "empty" | "mailto" | "tel" | "unsupported">;
  links: LinkCheckResult[];
  findings: LinkFinding[];
  durationMs: number;
};
