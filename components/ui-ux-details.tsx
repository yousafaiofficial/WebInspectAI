import type { AiConfidence, UiUxAiResult } from "@/lib/ai/types";

const confidenceStyles: Record<AiConfidence, string> = { high: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" };

export function UiUxDetails({ result }: { result: UiUxAiResult }) {
  return (
    <div>
      <div className="rounded-xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Summary</p><p className="mt-2 text-sm leading-6 text-slate-700">{result.summary}</p></div>
      {result.issues.length > 0 && <div className="mt-6"><h3 className="font-bold text-slate-950">Top priorities</h3><ol className="mt-3 space-y-3">{result.issues.slice(0, 5).map((issue, index) => <li key={`${issue.title}-${index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{index + 1}</span><p className="font-semibold text-slate-900">{issue.title}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${confidenceStyles[issue.confidence]}`}>{issue.confidence} confidence</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{issue.uxImpact}</p><p className="mt-2 text-sm font-medium text-slate-800">{issue.recommendation}</p><p className="mt-3 text-xs text-slate-400">Evidence: {issue.evidenceRefs.join(" · ")}</p></li>)}</ol></div>}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div><h3 className="font-bold text-slate-950">Strengths</h3><div className="mt-3 space-y-2">{result.strengths.length ? result.strengths.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-xl bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-950">{item.title}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{item.description}</p><p className="mt-2 text-[11px] text-emerald-700">{item.evidenceRefs.join(" · ")}</p></div>) : <p className="text-sm text-slate-500">No evidence-supported strengths were returned.</p>}</div></div>
        <div><h3 className="font-bold text-slate-950">Recommended next steps</h3><div className="mt-3 space-y-2">{result.recommendations.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{item.title}</p><span className="text-[10px] font-bold uppercase text-brand-700">{item.priority}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{item.action}</p></div>)}</div></div>
      </div>
      <p className="mt-5 rounded-lg bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">AI recommendations synthesize the deterministic scanner evidence shown in this report. They do not represent interaction testing, legal advice, or a compliance determination.</p>
      <p className="mt-4 text-right text-xs text-slate-400">{result.metadata.provider} · {result.metadata.model} · deterministic score · no screenshots · {result.metadata.durationMs} ms</p>
    </div>
  );
}
