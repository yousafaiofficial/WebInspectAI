import type { AccessibilityAuditResult } from "@/lib/auditor/accessibility/accessibility-types";

export function AccessibilityDetails({ result }: { result: AccessibilityAuditResult }) {
  const metrics = [
    ["Critical", result.summary.critical, "text-red-600"],
    ["Serious", result.summary.serious, "text-orange-600"],
    ["Moderate", result.summary.moderate, "text-amber-600"],
    ["Minor", result.summary.minor, "text-blue-600"],
    ["Affected elements", result.summary.affectedNodes, "text-slate-950"],
  ] as const;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {metrics.map(([label, value, color]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>)}
      </div>
      <div className="mt-5 space-y-2">
        {result.violations.slice(0, 5).map((violation) => (
          <div key={violation.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <span className={`size-2.5 shrink-0 rounded-full ${violation.impact === "critical" ? "bg-red-500" : violation.impact === "serious" ? "bg-orange-500" : violation.impact === "moderate" ? "bg-amber-500" : "bg-blue-500"}`} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{violation.help}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{violation.impact} · {violation.affectedNodes} affected element{violation.affectedNodes === 1 ? "" : "s"}</p></div>
          </div>
        ))}
        {!result.violations.length && <p className="rounded-lg bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800">No automated axe-core violations were detected on the rendered page.</p>}
      </div>
      <p className="mt-5 rounded-lg bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">Automated checks detect many common issues, but do not replace manual keyboard, screen-reader, and user testing.</p>
      <p className="mt-4 text-right text-xs text-slate-400">axe-core {result.metadata.axeVersion} · rendered audit completed in {result.metadata.durationMs} ms</p>
    </div>
  );
}
