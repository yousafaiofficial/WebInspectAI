import type { IssueSeverity } from "../../audit-types";
import type { NormalizedResponseHeaders } from "../../fetcher/safe-request";

export type SecurityRuleId = "https" | "hsts" | "csp" | "nosniff" | "framing" | "referrer-policy" | "permissions-policy" | "cookies" | "cross-origin" | "server-disclosure";
export type SecurityCheckStatus = "passed" | "warning" | "failed" | "info" | "not_applicable";
export type SecurityCheck = {
  id: SecurityRuleId;
  title: string;
  status: SecurityCheckStatus;
  severity: IssueSeverity;
  description: string;
  evidence: string[];
  recommendation: string;
  weight: number;
  scoreImpact: number;
};

export type SecurityAuditResult = {
  score: number;
  summary: { passed: number; recommendations: number; important: number };
  headers: {
    https: boolean;
    hsts?: { raw: string; maxAge?: number; includeSubDomains: boolean; preload: boolean };
    csp?: { raw: string; reportOnly: boolean; hasDefaultSrc: boolean; hasFrameAncestors: boolean; unsafeInline: boolean; unsafeEval: boolean };
    xContentTypeOptions?: string;
    referrerPolicy?: string;
    permissionsPolicy?: string;
    xFrameOptions?: string;
    crossOrigin: Record<string, string>;
    server?: string;
    poweredBy?: string;
  };
  cookies: { count: number; secure: number; httpOnly: number; sameSite: number; examples: string[] };
  checks: SecurityCheck[];
  durationMs: number;
};

export type SecurityAuditInput = { finalUrl: string; headers: NormalizedResponseHeaders };
