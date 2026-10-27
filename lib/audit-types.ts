import type { SeoAuditResult } from "./auditor/seo/seo-types";
import type { LinkAuditResult } from "./auditor/links/link-types";
import type { SecurityAuditResult } from "./auditor/security/security-types";
import type { AccessibilityAuditResponse } from "./auditor/accessibility/accessibility-types";
import type { MobileAuditResponse } from "./auditor/mobile/mobile-types";
import type { PerformanceAuditResponse } from "./auditor/performance/performance-types";
import type { UiUxAuditResponse } from "./ai/types";
import type { NormalizedResponseHeaders } from "./fetcher/safe-request";
import type { ReportSummary } from "./report/build-report-summary";

export type AuditCategory = "Performance" | "SEO" | "Accessibility" | "Mobile" | "Security" | "UI/UX" | "Broken Links";

export type IssueSeverity = "critical" | "important" | "improvement" | "passed";

export type AuditIssue = {
  id: string;
  severity: IssueSeverity;
  category: AuditCategory;
  title: string;
  description: string;
  impact: string;
  fix: string;
  source?: "real" | "demo";
};

export type AuditStep = {
  id: string;
  label: string;
};

export type RedirectInfo = {
  from: string;
  to: string;
  status: number;
};

export type FetchMetadata = {
  requestedUrl: string;
  normalizedUrl: string;
  finalUrl: string;
  hostname: string;
  httpStatus: number;
  statusText: string;
  contentType: string;
  responseSize: number;
  redirectCount: number;
  redirectChain: RedirectInfo[];
  fetchDurationMs: number;
  fetchedAt: string;
  isHtml: boolean;
};

export type WebsiteFetchResult = FetchMetadata & {
  html: string | null;
};

export type ServerWebsiteFetchResult = WebsiteFetchResult & {
  responseHeaders: NormalizedResponseHeaders;
};

export type FetchErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "CREDENTIALS_NOT_ALLOWED"
  | "BLOCKED_TARGET"
  | "DNS_FAILED"
  | "TIMEOUT"
  | "TOO_MANY_REDIRECTS"
  | "RESPONSE_TOO_LARGE"
  | "UNSUPPORTED_CONTENT"
  | "TLS_ERROR"
  | "CONNECTION_FAILED"
  | "UPSTREAM_ERROR";

export type FetchErrorResponse = {
  ok: false;
  error: { code: FetchErrorCode; message: string };
  metadata?: FetchMetadata;
};

export type FetchSuccessResponse = {
  ok: true;
  data: WebsiteFetchResult & { seo: SeoAuditResult; links: LinkAuditResult; security: SecurityAuditResult; accessibility: AccessibilityAuditResponse; mobile: MobileAuditResponse; performance: PerformanceAuditResponse; uiUx: UiUxAuditResponse; report: ReportSummary };
};

export type FetchApiResponse = FetchSuccessResponse | FetchErrorResponse;
