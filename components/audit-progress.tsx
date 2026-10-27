"use client";

import { CheckIcon } from "@/components/icons";
import { auditSteps } from "@/lib/audit-progress-data";

type AuditProgressProps = {
  currentStep: number;
};

export function AuditProgress({ currentStep }: AuditProgressProps) {
  const percent = Math.min(100, Math.round(((currentStep + 0.6) / auditSteps.length) * 100));
  return (
    <div>
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">Audit progress</span>
          <span className="font-bold tabular-nums text-brand-700">{percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="progress-active h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {auditSteps.map((step, index) => {
          const complete = index < currentStep;
          const active = index === currentStep;
          return (
            <li key={step.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${active ? "border-brand-200 bg-brand-50" : complete ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/70"}`}>
              <span className={`grid size-7 shrink-0 place-items-center rounded-full ${complete ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {complete ? <CheckIcon className="size-4" /> : active ? <span className="size-2 animate-pulse rounded-full bg-white" /> : <span className="text-xs font-bold">{index + 1}</span>}
              </span>
              <span className={`text-sm font-medium ${active ? "text-brand-700" : complete ? "text-slate-700" : "text-slate-400"}`}>{step.label}</span>
              {active && <span className="ml-auto text-xs font-semibold text-brand-600">Checking…</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
