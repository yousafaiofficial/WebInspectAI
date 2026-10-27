"use client";

import { useState } from "react";
import type { AuditIssue, IssueSeverity } from "@/lib/audit-types";
import { CheckIcon, ChevronIcon } from "@/components/icons";

const styles: Record<IssueSeverity, { label: string; badge: string; dot: string; border: string }> = {
  critical: { label: "Critical", badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500", border: "border-l-red-500" },
  important: { label: "Important", badge: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500", border: "border-l-orange-500" },
  improvement: { label: "Improvement", badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500", border: "border-l-blue-500" },
  passed: { label: "Passed", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", border: "border-l-emerald-500" },
};

export function IssueCard({ issue }: { issue: AuditIssue }) {
  const [open, setOpen] = useState(issue.severity === "critical");
  const style = styles[issue.severity];

  return (
    <article className={`overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white ${style.border}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-4 p-4 text-left sm:p-5">
        <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${style.badge}`}>{style.label}</span>
            <span className="text-xs font-medium text-slate-500">{issue.category}</span>
            {issue.source && <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${issue.source === "real" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{issue.source}</span>}
          </span>
          <span className="mt-2 block font-semibold text-slate-900">{issue.title}</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">{issue.description}</span>
        </span>
        <ChevronIcon className={`mt-1 size-5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-5 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:grid-cols-2 sm:px-9">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Why it matters</h4>
            <p className="mt-2 text-sm leading-6 text-slate-700">{issue.impact}</p>
          </div>
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700"><CheckIcon className="size-4" /> Recommended fix</h4>
            <p className="mt-2 text-sm leading-6 text-slate-700">{issue.fix}</p>
          </div>
        </div>
      )}
    </article>
  );
}
