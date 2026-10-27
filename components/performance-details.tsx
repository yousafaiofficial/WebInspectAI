import type { PerformanceAuditResult, PerformanceRating } from "@/lib/auditor/performance/performance-types";

const ratingStyles: Record<PerformanceRating, string> = {
  good: "bg-emerald-100 text-emerald-700",
  "needs-improvement": "bg-amber-100 text-amber-700",
  poor: "bg-red-100 text-red-700",
  "not-rated": "bg-slate-100 text-slate-600",
};

const ratingLabels: Record<PerformanceRating, string> = { good: "Good", "needs-improvement": "Needs improvement", poor: "Poor", "not-rated": "Not rated" };

function bytes(value: number) {
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`;
}

export function PerformanceDetails({ result }: { result: PerformanceAuditResult }) {
  const order = ["lcp", "fcp", "tbt", "cls", "speedIndex", "interactive", "serverResponseTime"] as const;
  const metrics = order.flatMap((id) => result.metrics[id] ? [result.metrics[id]!] : []);
  const diagnostics = [
    result.diagnostics.totalTransferredBytes !== undefined && ["Transferred", bytes(result.diagnostics.totalTransferredBytes)],
    result.diagnostics.totalResourceCount !== undefined && ["Resources", String(result.diagnostics.totalResourceCount)],
    result.diagnostics.domSize !== undefined && ["DOM elements", String(Math.round(result.diagnostics.domSize))],
    result.diagnostics.scriptBytes !== undefined && ["Scripts", bytes(result.diagnostics.scriptBytes)],
    result.diagnostics.imageBytes !== undefined && ["Images", bytes(result.diagnostics.imageBytes)],
    result.diagnostics.mainThreadTimeMs !== undefined && ["Main thread", `${Math.round(result.diagnostics.mainThreadTimeMs)} ms`],
  ].filter((item): item is string[] => Boolean(item));
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-700">{metric.label}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${ratingStyles[metric.rating]}`}>{ratingLabels[metric.rating]}</span></div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{metric.displayValue}</p>
          </div>
        ))}
      </div>
      {result.opportunities.length > 0 && <div className="mt-6"><h3 className="font-bold text-slate-950">Top opportunities</h3><div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">{result.opportunities.slice(0, 5).map((item) => <div key={item.id} className="p-4"><p className="text-sm font-semibold text-slate-900">{item.title}</p>{(item.savingsMs || item.savingsBytes) && <p className="mt-1 text-xs font-semibold text-brand-700">Potential savings: {[item.savingsMs ? `${Math.round(item.savingsMs)} ms` : "", item.savingsBytes ? bytes(item.savingsBytes) : ""].filter(Boolean).join(" / ")}</p>}</div>)}</div></div>}
      {diagnostics.length > 0 && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{diagnostics.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p></div>)}</div>}
      <p className="mt-5 rounded-lg bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">Performance results are Lighthouse lab measurements from a controlled mobile test. Real-user performance may differ.</p>
      <p className="mt-4 text-right text-xs text-slate-400">Lighthouse {result.metadata.lighthouseVersion} · {result.metadata.profile} · {result.metadata.durationMs} ms</p>
    </div>
  );
}
