import { CheckIcon } from "@/components/icons";
import type { SecurityAuditResult, SecurityRuleId } from "@/lib/auditor/security/security-types";

const featured: SecurityRuleId[] = ["https", "hsts", "csp", "nosniff", "framing", "referrer-policy", "permissions-policy", "cookies"];

export function SecurityDetails({ result }: { result: SecurityAuditResult }) {
  const checks = featured.map((id) => result.checks.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((item) => (
          <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${item.status === "passed" ? "bg-emerald-100 text-emerald-700" : item.severity === "critical" || item.severity === "important" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
              {item.status === "passed" ? <CheckIcon className="size-3.5" /> : <span className="text-xs font-bold">!</span>}
            </span>
            <div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.description}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Main response cookies: <strong className="text-slate-900">{result.cookies.count}</strong> · Secure: {result.cookies.secure} · HttpOnly: {result.cookies.httpOnly} · SameSite: {result.cookies.sameSite}
      </div>
      <p className="mt-4 text-right text-xs text-slate-400">Headers analyzed server-side in {result.durationMs} ms</p>
    </div>
  );
}
