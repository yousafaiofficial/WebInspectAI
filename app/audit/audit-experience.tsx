"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuditProgress } from "@/components/audit-progress";
import { GlobeIcon, ShieldIcon } from "@/components/icons";
import { auditSteps } from "@/lib/audit-progress-data";
import type { FetchApiResponse, FetchMetadata } from "@/lib/audit-types";

const errorTitles: Record<string, string> = {
  INVALID_URL: "That URL isn’t valid",
  UNSUPPORTED_PROTOCOL: "That protocol isn’t supported",
  CREDENTIALS_NOT_ALLOWED: "Remove login details from the URL",
  BLOCKED_TARGET: "This address can’t be tested",
  DNS_FAILED: "Website not found",
  TIMEOUT: "The website took too long to respond",
  TOO_MANY_REDIRECTS: "Too many redirects",
  RESPONSE_TOO_LARGE: "The webpage is too large",
  UNSUPPORTED_CONTENT: "This isn’t an HTML webpage",
  TLS_ERROR: "Secure connection failed",
  CONNECTION_FAILED: "Website couldn’t be reached",
  UPSTREAM_ERROR: "Something went wrong",
};

export function AuditExperience({ url }: { url: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [fetchState, setFetchState] = useState<"loading" | "success" | "error">("loading");
  const [fetchError, setFetchError] = useState<{ code: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [finalUrl, setFinalUrl] = useState(url);

  useEffect(() => {
    const controller = new AbortController();
    async function loadWebsite() {
      setFetchState("loading");
      setFetchError(null);
      setCurrentStep(0);
      try {
        const response = await fetch("/api/audit/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });
        const payload = await response.json() as FetchApiResponse;
        if (!payload.ok) {
          setFetchState("error");
          setFetchError(payload.error);
          return;
        }
        const { html: _html, seo, links, security, accessibility, mobile, performance, uiUx, report, ...metadata } = payload.data;
        sessionStorage.setItem("webinspectai:fetch-metadata", JSON.stringify(metadata satisfies FetchMetadata));
        sessionStorage.setItem("webinspectai:seo-result", JSON.stringify(seo));
        sessionStorage.setItem("webinspectai:link-result", JSON.stringify(links));
        sessionStorage.setItem("webinspectai:security-result", JSON.stringify(security));
        sessionStorage.setItem("webinspectai:accessibility-result", JSON.stringify(accessibility));
        sessionStorage.setItem("webinspectai:mobile-result", JSON.stringify(mobile));
        sessionStorage.setItem("webinspectai:performance-result", JSON.stringify(performance));
        sessionStorage.setItem("webinspectai:ui-ux-result", JSON.stringify(uiUx));
        sessionStorage.setItem("webinspectai:report-summary", JSON.stringify(report));
        setFinalUrl(payload.data.finalUrl);
        setFetchState("success");
        setCurrentStep(1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setFetchState("error");
          setFetchError({ code: "CONNECTION_FAILED", message: "We couldn’t start the website check. Please try again." });
        }
      }
    }
    loadWebsite();
    return () => controller.abort();
  }, [url, attempt]);

  useEffect(() => {
    if (fetchState !== "success") return;
    if (currentStep >= auditSteps.length - 1) {
      const timeout = window.setTimeout(() => router.push(`/report?url=${encodeURIComponent(finalUrl)}`), 900);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setCurrentStep((step) => step + 1), 420);
    return () => window.clearTimeout(timeout);
  }, [currentStep, fetchState, finalUrl, router]);

  return (
    <div className="bg-mist px-5 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-100"><ShieldIcon className="size-7" /></span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">Inspecting your website</h1>
          <p className="mt-2 text-slate-600">We’re checking the signals that affect visibility, experience, and trust.</p>
          <div className="mx-auto mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
            <GlobeIcon className="size-4 shrink-0 text-brand-600" />
            <span className="truncate">{url}</span>
          </div>
        </div>
        {fetchState === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-white p-7 text-center shadow-panel sm:p-10">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-red-50 text-xl font-bold text-red-600">!</span>
            <h2 className="mt-4 text-xl font-bold text-slate-950">{errorTitles[fetchError?.code || ""] || "Website check failed"}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{fetchError?.message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => setAttempt((value) => value + 1)} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Try again</button>
              <button onClick={() => router.push("/")} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Use another URL</button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel sm:p-8">
            <AuditProgress currentStep={currentStep} />
          </div>
        )}
        <p className="mt-5 text-center text-xs text-slate-500">All category analyzers and the overall Website Health score are calculated from this audit.</p>
      </div>
    </div>
  );
}
