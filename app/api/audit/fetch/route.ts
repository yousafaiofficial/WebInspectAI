import { NextResponse } from "next/server";
import { isIP } from "node:net";
import type { FetchErrorResponse, FetchSuccessResponse } from "@/lib/audit-types";
import { WebsiteFetchError, errorStatus } from "@/lib/fetcher/fetch-errors";
import { fetchWebsite } from "@/lib/fetcher/fetch-website";
import { UrlValidationError } from "@/lib/url/normalize-url";
import { analyzeSeo } from "@/lib/auditor/seo/analyze-seo";
import { checkLinks } from "@/lib/auditor/links/check-links";
import { analyzeSecurity } from "@/lib/auditor/security/analyze-security";
import { analyzeAccessibilitySafe } from "@/lib/auditor/accessibility/analyze-accessibility";
import { analyzeMobileSafe } from "@/lib/auditor/mobile/analyze-mobile";
import { analyzePerformanceSafe } from "@/lib/auditor/performance/analyze-performance";
import { buildAiAnalysisInput } from "@/lib/ai/build-ai-input";
import { analyzeUiUx } from "@/lib/ai/analyze-ui-ux";
import { buildReportSummary } from "@/lib/report/build-report-summary";

import { MemoryRateLimiter } from "@/lib/rate-limit/rate-limiter";
import { globalAuditSemaphore } from "@/lib/concurrency/audit-semaphore";
import { env } from "@/lib/config/env";
import { runAudit } from "@/lib/audit/run-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const rateLimiter = new MemoryRateLimiter(env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_SECONDS);

function getClientIp(req: Request) {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp && isIP(cfIp)) return cfIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((s) => s.trim()).filter((s) => isIP(s));
    if (ips.length > 0) {
      return ips[ips.length - 1];
    }
  }
  return "anonymous";
}

export async function POST(request: Request) {
  // 1. Rate Limiting
  const ip = getClientIp(request);
  const rateLimitResult = await rateLimiter.check(ip);
  if (!rateLimitResult.allowed) {
    console.warn(`[Audit] Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "You have reached the free audit limit. Try again later." } },
      { status: 429, headers: { "Retry-After": Math.ceil((rateLimitResult.resetTimeMs - Date.now()) / 1000).toString() } }
    );
  }

  // 2. Request Validation
  if (request.headers.get("content-type") !== "application/json") {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Content type must be application/json." } }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > 10240) {
    return NextResponse.json({ ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large." } }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON", message: "Send a valid JSON request containing a website URL." } }, { status: 400 });
  }

  const url = typeof body === "object" && body !== null && "url" in body ? (body as { url?: unknown }).url : undefined;
  if (typeof url !== "string" || url.length > 2048) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_URL", message: "Enter a valid website URL up to 2048 characters." } }, { status: 400 });
  }

  // 3. Concurrency
  const acquired = await globalAuditSemaphore.acquire();
  if (!acquired) {
    console.warn(`[Audit] Capacity reached. Rejected audit for ${url}`);
    return NextResponse.json({ ok: false, error: { code: "AUDIT_CAPACITY_REACHED", message: "Our servers are currently at capacity. Please try again in a few minutes." } }, { status: 503 });
  }

  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[Audit] Started ${auditId} for ${url} by IP ${ip}`);

  // 4. Timeout Budget
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    console.warn(`[Audit] Timeout ${auditId}`);
    abortController.abort();
  }, env.AUDIT_TIMEOUT_SECONDS * 1000);

  try {
    const start = Date.now();
    const data = await runAudit(url, abortController.signal);
    console.log(`[Audit] Completed ${auditId} in ${Date.now() - start}ms`);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error(`[Audit] Failed ${auditId}`, error);
    if ((error as any).name === "AbortError") {
      return NextResponse.json({ ok: false, error: { code: "TIMEOUT", message: "The audit took too long and was aborted." } }, { status: 504 });
    }
    if (error instanceof UrlValidationError) {
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: errorStatus(error.code) });
    }
    if (error instanceof WebsiteFetchError) {
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message }, metadata: error.metadata }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: { code: "UPSTREAM_ERROR", message: "The website could not be fetched right now. Please try again." } }, { status: 502 });
  } finally {
    clearTimeout(timeout);
    globalAuditSemaphore.release();
  }
}
