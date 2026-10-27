import { CheckIcon } from "@/components/icons";
import type { SeoAuditResult, SeoRuleId } from "@/lib/auditor/seo/seo-types";

const featured: SeoRuleId[] = ["title", "meta-description", "canonical", "h1", "image-alt", "robots", "structured-data", "viewport"];

export function SeoDetails({ result }: { result: SeoAuditResult }) {
  const checks = featured.map((id) => result.checks.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p><p className="mt-2 truncate text-sm font-semibold text-slate-900">{result.metadata.title || "Not found"}</p><p className="mt-1 text-xs text-slate-500">{result.metadata.titleLength} characters</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Indexing</p><p className="mt-2 text-sm font-semibold text-slate-900">{result.metadata.robots.includes("noindex") ? "Noindex detected" : "Indexing allowed"}</p><p className="mt-1 text-xs text-slate-500">{result.metadata.robots.length ? result.metadata.robots.join(", ") : "No restrictive directives"}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page structure</p><p className="mt-2 text-sm font-semibold text-slate-900">{result.headings.h1} H1 · {result.images.total} images</p><p className="mt-1 text-xs text-slate-500">{result.images.missingAlt} missing alt · {result.structuredData.blocks} JSON-LD</p></div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {checks.map((item) => (
          <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${item.status === "passed" ? "bg-emerald-100 text-emerald-700" : item.severity === "important" || item.severity === "critical" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
              {item.status === "passed" ? <CheckIcon className="size-3.5" /> : <span className="text-xs font-bold">!</span>}
            </span>
            <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p></div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-right text-xs text-slate-400">Analyzed server-side in {result.analysisDurationMs} ms</p>
    </div>
  );
}
