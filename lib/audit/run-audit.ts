import { fetchWebsite } from "@/lib/fetcher/fetch-website";
import { analyzeSeo } from "@/lib/auditor/seo/analyze-seo";
import { checkLinks } from "@/lib/auditor/links/check-links";
import { analyzeSecurity } from "@/lib/auditor/security/analyze-security";
import { analyzeAccessibilitySafe } from "@/lib/auditor/accessibility/analyze-accessibility";
import { analyzeMobileSafe } from "@/lib/auditor/mobile/analyze-mobile";
import { analyzePerformanceSafe } from "@/lib/auditor/performance/analyze-performance";
import { buildAiAnalysisInput } from "@/lib/ai/build-ai-input";
import { analyzeUiUx } from "@/lib/ai/analyze-ui-ux";
import { buildReportSummary } from "@/lib/report/build-report-summary";

export async function runAudit(url: string, signal?: AbortSignal) {
  // Pass signal to fetchWebsite if supported in future, currently just timeout handling wrapper
  const data = await fetchWebsite(url);
  
  if (signal?.aborted) throw new Error("AbortError");

  const seo = analyzeSeo({ html: data.html || "", finalUrl: data.finalUrl, status: data.httpStatus, contentType: data.contentType });
  const security = analyzeSecurity({ finalUrl: data.finalUrl, headers: data.responseHeaders });
  
  const [links, accessibility, mobile] = await Promise.all([
    checkLinks({ html: data.html || "", finalUrl: data.finalUrl }),
    analyzeAccessibilitySafe({ html: data.html || "", finalUrl: data.finalUrl }),
    analyzeMobileSafe({ html: data.html || "", finalUrl: data.finalUrl, hasViewportMeta: Boolean(seo.metadata.viewport) }),
  ]);

  if (signal?.aborted) throw new Error("AbortError");

  // Lighthouse gets a separate Chromium process
  const performance = await analyzePerformanceSafe(data.finalUrl);
  
  if (signal?.aborted) throw new Error("AbortError");

  const uiUx = await analyzeUiUx(buildAiAnalysisInput({ finalUrl: data.finalUrl, seo, links, security, accessibility, mobile, performance }));
  
  const { responseHeaders: _privateHeaders, ...publicData } = data;
  const report = buildReportSummary({ metadata: publicData, seo, links, security, accessibility, mobile, performance, uiUx });
  
  return { ...publicData, seo, links, security, accessibility, mobile, performance, uiUx, report };
}
