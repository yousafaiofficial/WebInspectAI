import type { AuditCategory } from "@/lib/audit-types";

function scoreColor(score: number) {
  if (score >= 85) return { bar: "bg-emerald-500", text: "text-emerald-700", badge: "bg-emerald-50" };
  if (score >= 75) return { bar: "bg-sky-500", text: "text-sky-700", badge: "bg-sky-50" };
  return { bar: "bg-amber-500", text: "text-amber-700", badge: "bg-amber-50" };
}

export function ScoreCard({ category, source = "demo" }: { category: { id: string; name: string; score: number; summary: string }; source?: "real" | "demo" }) {
  const colors = scoreColor(category.score);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">{category.name}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">{category.summary}</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-xl font-bold ${colors.badge} ${colors.text}`}>{category.score}</span>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${category.score}%` }} />
      </div>
    </article>
  );
}
