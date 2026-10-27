import type { LinkAuditResult } from "@/lib/auditor/links/link-types";

export function LinkDetails({ result }: { result: LinkAuditResult }) {
  const metrics = [
    ["Discovered", result.summary.httpDiscovered], ["Checked", result.summary.checked], ["Healthy", result.summary.healthy],
    ["Redirected", result.summary.redirected], ["Broken", result.summary.broken], ["Unavailable", result.summary.unavailable],
  ] as const;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${label === "Broken" && value ? "text-red-600" : "text-slate-950"}`}>{value}</p></div>)}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Not network-checked</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{result.classification.hashOnly} hash · {result.classification.mailto} email · {result.classification.tel} telephone · {result.classification.empty} empty · {result.classification.unsupported} unsupported</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Audit coverage</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{result.summary.skippedDueToLimit ? `${result.summary.skippedDueToLimit} unique destinations were skipped by the per-page limit.` : "All discovered unique HTTP(S) destinations fit within the audit limit."}</p>
        </div>
      </div>
      <p className="mt-4 text-right text-xs text-slate-400">Checked with bounded concurrency in {result.durationMs} ms</p>
    </div>
  );
}
