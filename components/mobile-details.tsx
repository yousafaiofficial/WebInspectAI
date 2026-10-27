import { CheckIcon } from "@/components/icons";
import type { MobileAuditResult } from "@/lib/auditor/mobile/mobile-types";

export function MobileDetails({ result }: { result: MobileAuditResult }) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {result.viewports.map((viewport) => (
          <div key={viewport.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">{viewport.width}px</p>
              <span className={`grid size-6 place-items-center rounded-full ${viewport.horizontalOverflow ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {viewport.horizontalOverflow ? <span className="text-xs font-bold">!</span> : <CheckIcon className="size-4" />}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{viewport.name}</p>
            <p className={`mt-3 text-xs font-semibold ${viewport.horizontalOverflow ? "text-amber-700" : "text-emerald-700"}`}>{viewport.horizontalOverflow ? `${viewport.overflowPixels}px horizontal overflow` : "Fits viewport"}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Small tap targets</p><p className="mt-1 text-2xl font-bold text-slate-950">{result.summary.smallTapTargets}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Tiny text regions</p><p className="mt-1 text-2xl font-bold text-slate-950">{result.summary.tinyTextIssues}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Clipped elements</p><p className="mt-1 text-2xl font-bold text-slate-950">{result.summary.clippedElements}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Large overlays</p><p className="mt-1 text-2xl font-bold text-slate-950">{result.summary.overlayIssues}</p></div>
      </div>
      <p className="mt-5 rounded-lg bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">Responsive checks use deterministic layout heuristics at representative viewports. They complement, but do not replace, testing on real devices and with varied content.</p>
      <p className="mt-4 text-right text-xs text-slate-400">Playwright · {result.summary.viewportsTested} viewports · {result.metadata.screenshotsCaptured} temporary screenshots · {result.metadata.durationMs} ms</p>
    </div>
  );
}
