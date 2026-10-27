"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportSummary } from "@/lib/report/build-report-summary";
import { OverallHealthScore } from "@/components/overall-health-score";
import { ScoreCard } from "@/components/score-card";
import { ReportSection } from "@/components/report-section";
import { IssueCard } from "@/components/issue-card";
import { PerformanceDetails } from "@/components/performance-details";
import { SeoDetails } from "@/components/seo-details";
import { AccessibilityDetails } from "@/components/accessibility-details";
import { MobileDetails } from "@/components/mobile-details";
import { SecurityDetails } from "@/components/security-details";
import { LinkDetails } from "@/components/link-details";
import { UiUxDetails } from "@/components/ui-ux-details";
import type { FetchMetadata } from "@/lib/audit-types";
import type { SeoAuditResult } from "@/lib/auditor/seo/seo-types";
import type { LinkAuditResult } from "@/lib/auditor/links/link-types";
import type { SecurityAuditResult } from "@/lib/auditor/security/security-types";
import type { AccessibilityAuditResponse } from "@/lib/auditor/accessibility/accessibility-types";
import type { MobileAuditResponse } from "@/lib/auditor/mobile/mobile-types";
import type { PerformanceAuditResponse } from "@/lib/auditor/performance/performance-types";
import type { UiUxAuditResponse } from "@/lib/ai/types";

export function ReportView({ initialUrl }: { initialUrl?: string }) {
  const router = useRouter();
  const [report, setReport] = useState<ReportSummary | null>(null);
  
  // States for all the individual results
  const [seoResult, setSeoResult] = useState<SeoAuditResult | null>(null);
  const [linkResult, setLinkResult] = useState<LinkAuditResult | null>(null);
  const [securityResult, setSecurityResult] = useState<SecurityAuditResult | null>(null);
  const [accessibilityResult, setAccessibilityResult] = useState<AccessibilityAuditResponse | null>(null);
  const [mobileResult, setMobileResult] = useState<MobileAuditResponse | null>(null);
  const [performanceResult, setPerformanceResult] = useState<PerformanceAuditResponse | null>(null);
  const [uiUxResult, setUiUxResult] = useState<UiUxAuditResponse | null>(null);

  useEffect(() => {
    try {
      const savedReport = sessionStorage.getItem("webinspectai:report-summary");
      if (!savedReport) {
        if (initialUrl) {
           // We might need to run the audit if they landed here via a URL, but for now just redirect to root
           router.push(`/?url=${encodeURIComponent(initialUrl)}`);
        } else {
           router.push("/");
        }
        return;
      }
      setReport(JSON.parse(savedReport));
      setSeoResult(JSON.parse(sessionStorage.getItem("webinspectai:seo-result") || "null"));
      setLinkResult(JSON.parse(sessionStorage.getItem("webinspectai:link-result") || "null"));
      setSecurityResult(JSON.parse(sessionStorage.getItem("webinspectai:security-result") || "null"));
      setAccessibilityResult(JSON.parse(sessionStorage.getItem("webinspectai:accessibility-result") || "null"));
      setMobileResult(JSON.parse(sessionStorage.getItem("webinspectai:mobile-result") || "null"));
      setPerformanceResult(JSON.parse(sessionStorage.getItem("webinspectai:performance-result") || "null"));
      setUiUxResult(JSON.parse(sessionStorage.getItem("webinspectai:ui-ux-result") || "null"));
    } catch (e) {
      router.push("/");
    }
  }, [initialUrl, router]);

  if (!report) {
    return <div className="p-10 text-center">Loading report...</div>;
  }

  const { overall, status } = report;
  
  const categoryMeta: Record<string, { name: string; summary: string }> = {
    performance: { name: "Performance", summary: "Speed and responsiveness" },
    seo: { name: "SEO", summary: "Search engine optimization" },
    accessibility: { name: "Accessibility", summary: "Usability for all" },
    mobile: { name: "Mobile", summary: "Responsive design" },
    security: { name: "Security", summary: "Headers and practices" },
    links: { name: "Broken Links", summary: "Internal and external links" },
    uiux: { name: "UI/UX", summary: "User interface and experience" }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="mx-auto max-w-5xl px-5 sm:px-6 space-y-10">
        
        {/* Header */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Website Health Report</h1>
          <p className="text-slate-500 mb-6">{report.url}</p>
          
          {status === "failed" || !overall.score ? (
            <div className="p-6 bg-red-50 text-red-700 rounded-xl">
              <h2 className="text-xl font-bold mb-2">Audit Failed or Insufficient Coverage</h2>
              <p>Coverage: {overall.coverage}%</p>
              <p>{(overall as any).explanation}</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-center gap-10">
              <OverallHealthScore score={overall.score} />
              <div className="text-left space-y-3 max-w-md">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Coverage</div>
                  <div className="text-xl font-bold text-slate-900">{overall.coverage}%</div>
                </div>
                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl leading-relaxed">
                  {(overall as any).explanation || 
                   "Website Health is a weighted average of Performance, SEO, Accessibility, Mobile, Security, Broken Links, and UI/UX. Unavailable categories are excluded and remaining weights are normalized."}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Categories */}
        {overall.categories.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Category Scores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {overall.categories.map((c) => (
                <ScoreCard key={c.id} category={{ id: c.id, name: categoryMeta[c.id]?.name || c.id, score: c.score, summary: categoryMeta[c.id]?.summary || "" }} source="real" />
              ))}
            </div>
          </section>
        )}

        {/* Unavailable Categories */}
        {overall.unavailableCategories.length > 0 && (
          <section className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
            <h2 className="text-lg font-bold text-amber-900 mb-4">Unavailable Categories</h2>
            <ul className="space-y-2">
              {overall.unavailableCategories.map((c) => (
                <li key={c.id} className="text-amber-800 text-sm">
                  <strong>{categoryMeta[c.id]?.name || c.id}:</strong> {c.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Top Issues */}
        {report.topIssues.length > 0 && (
          <ReportSection title="Top Issues" description="Highest priority items that need your attention.">
            <div className="space-y-4">
              {report.topIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </ReportSection>
        )}

        {/* Details Sections */}
        {performanceResult?.available && performanceResult.result && (
          <ReportSection id="performance" title="Performance Details">
            <PerformanceDetails result={performanceResult.result} />
          </ReportSection>
        )}
        
        {seoResult && (
          <ReportSection id="seo" title="SEO Details">
            <SeoDetails result={seoResult} />
          </ReportSection>
        )}

        {accessibilityResult?.available && accessibilityResult.result && (
          <ReportSection id="accessibility" title="Accessibility Details">
            <AccessibilityDetails result={accessibilityResult.result} />
          </ReportSection>
        )}

        {mobileResult?.available && mobileResult.result && (
          <ReportSection id="mobile" title="Mobile & Responsiveness Details">
            <MobileDetails result={mobileResult.result} />
          </ReportSection>
        )}

        {securityResult && (
          <ReportSection id="security" title="Security Details">
            <SecurityDetails result={securityResult} />
          </ReportSection>
        )}

        {linkResult && (
          <ReportSection id="links" title="Broken Links Details">
            <LinkDetails result={linkResult} />
          </ReportSection>
        )}

        {uiUxResult?.available && uiUxResult.result && (
          <ReportSection id="uiux" title="UI/UX Details">
            <UiUxDetails result={uiUxResult.result} />
          </ReportSection>
        )}
      </div>
    </div>
  );
}
