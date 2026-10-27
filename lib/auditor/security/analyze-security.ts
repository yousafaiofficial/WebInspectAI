import "server-only";
import type { IssueSeverity } from "../../audit-types";
import { SECURITY_RULES } from "./security-rules";
import { calculateSecurityScore, securityScoreImpact } from "./security-score";
import type { SecurityAuditInput, SecurityAuditResult, SecurityCheck, SecurityCheckStatus, SecurityRuleId } from "./security-types";

const EVIDENCE_LIMIT = 5;
type CheckInput = Omit<SecurityCheck, "title" | "weight" | "scoreImpact"> & { id: SecurityRuleId };

function check(input: CheckInput): SecurityCheck {
  const rule = SECURITY_RULES[input.id];
  return { ...input, title: rule.title, weight: rule.weight, scoreImpact: securityScoreImpact(input.id, input.status) };
}

function severity(status: SecurityCheckStatus, important = false): IssueSeverity {
  if (status === "passed" || status === "not_applicable") return "passed";
  if (status === "failed") return "critical";
  return important && status === "warning" ? "important" : "improvement";
}

export function analyzeSecurity(input: SecurityAuditInput): SecurityAuditResult {
  const started = performance.now();
  const first = (name: string) => input.headers[name.toLowerCase()]?.[0]?.trim();
  const all = (name: string) => input.headers[name.toLowerCase()] || [];
  const checks: SecurityCheck[] = [];
  const isHttps = new URL(input.finalUrl).protocol === "https:";
  checks.push(check({ id: "https", status: isHttps ? "passed" : "failed", severity: isHttps ? "passed" : "critical", description: isHttps ? "The final page is delivered over HTTPS." : "The final page is delivered over unencrypted HTTP.", evidence: [input.finalUrl], recommendation: isHttps ? "No change is necessary." : "Serve the page over HTTPS and redirect HTTP traffic to its HTTPS equivalent." }));

  const hstsRaw = first("strict-transport-security");
  let hsts: SecurityAuditResult["headers"]["hsts"];
  if (hstsRaw) {
    const directives = hstsRaw.split(";").map((item) => item.trim());
    const maxAgeRaw = directives.find((item) => item.toLowerCase().startsWith("max-age="))?.split("=")[1];
    const parsed = maxAgeRaw === undefined ? undefined : Number(maxAgeRaw);
    hsts = { raw: hstsRaw, maxAge: Number.isFinite(parsed) ? parsed : undefined, includeSubDomains: directives.some((item) => item.toLowerCase() === "includesubdomains"), preload: directives.some((item) => item.toLowerCase() === "preload") };
  }
  const hstsActive = Boolean(hsts && typeof hsts.maxAge === "number" && hsts.maxAge > 0);
  const hstsStatus: SecurityCheckStatus = !isHttps ? "not_applicable" : hstsActive ? "passed" : "warning";
  checks.push(check({ id: "hsts", status: hstsStatus, severity: severity(hstsStatus, true), description: !isHttps ? "HSTS is only meaningful after HTTPS is enabled." : hsts ? `HSTS is present with max-age ${hsts.maxAge ?? "not parsed"}${hsts.includeSubDomains ? ", includeSubDomains" : ""}${hsts.preload ? ", and a preload directive" : ""}. ${hstsActive ? "" : "A missing, invalid, or zero max-age does not provide active HSTS protection. "}A preload directive does not confirm browser preload-list enrollment.` : "No Strict-Transport-Security header was detected on this HTTPS page.", evidence: hstsRaw ? [hstsRaw] : [], recommendation: !isHttps ? "Enable HTTPS before configuring HSTS." : hstsActive ? "Review max-age and subdomain coverage against your deployment requirements." : hstsRaw ? "Set a deliberate positive max-age after confirming the HTTPS deployment is ready." : "Consider HSTS after confirming all intended traffic and subdomains support HTTPS." }));

  const cspRaw = all("content-security-policy").join("; ");
  const cspReportOnly = all("content-security-policy-report-only").join("; ");
  const effectiveCsp = cspRaw || cspReportOnly;
  const csp = effectiveCsp ? { raw: effectiveCsp, reportOnly: !cspRaw && Boolean(cspReportOnly), hasDefaultSrc: /(?:^|;)\s*default-src\b/i.test(effectiveCsp), hasFrameAncestors: /(?:^|;)\s*frame-ancestors\b/i.test(effectiveCsp), unsafeInline: /['"]unsafe-inline['"]/i.test(effectiveCsp), unsafeEval: /['"]unsafe-eval['"]/i.test(effectiveCsp) } : undefined;
  const cspStatus: SecurityCheckStatus = !csp ? "warning" : csp.reportOnly || csp.unsafeInline || csp.unsafeEval || !csp.hasDefaultSrc ? "warning" : "passed";
  const cspNotes = csp ? [csp.reportOnly ? "report-only" : "enforcing", !csp.hasDefaultSrc ? "no default-src" : "", csp.unsafeInline ? "contains unsafe-inline" : "", csp.unsafeEval ? "contains unsafe-eval" : ""].filter(Boolean) : [];
  checks.push(check({ id: "csp", status: cspStatus, severity: severity(cspStatus, true), description: !csp ? "No enforcing or report-only Content-Security-Policy was detected." : `A ${csp.reportOnly ? "report-only" : "enforcing"} CSP was detected${cspNotes.length > 1 ? `; review: ${cspNotes.slice(1).join(", ")}` : ""}. Unsafe directives can be practical tradeoffs and do not alone prove insecurity.`, evidence: csp ? cspNotes : [], recommendation: !csp ? "Consider a tested CSP that restricts content sources without breaking required functionality." : csp.reportOnly ? "Use reports to refine the policy before enforcing it." : csp.unsafeInline || csp.unsafeEval ? "Reduce unsafe script/style allowances where practical and test changes carefully." : "Continue testing and maintaining the policy as application resources change." }));

  const nosniff = first("x-content-type-options");
  const nosniffOk = nosniff?.toLowerCase() === "nosniff";
  checks.push(check({ id: "nosniff", status: nosniffOk ? "passed" : "warning", severity: nosniffOk ? "passed" : "improvement", description: nosniffOk ? "X-Content-Type-Options is set to nosniff." : nosniff ? `X-Content-Type-Options has the unexpected value “${nosniff}”.` : "X-Content-Type-Options: nosniff was not detected.", evidence: nosniff ? [nosniff] : [], recommendation: nosniffOk ? "No change is necessary." : "Consider sending X-Content-Type-Options: nosniff." }));

  const xFrame = first("x-frame-options");
  const xFrameValid = ["deny", "sameorigin"].includes(xFrame?.toLowerCase() || "");
  const framingProtected = xFrameValid || Boolean(csp?.hasFrameAncestors && !csp.reportOnly);
  checks.push(check({ id: "framing", status: framingProtected ? "passed" : "warning", severity: framingProtected ? "passed" : "important", description: csp?.hasFrameAncestors && !csp.reportOnly ? "The enforcing CSP includes frame-ancestors framing control." : xFrameValid ? `X-Frame-Options is set to ${xFrame}.` : "No enforcing CSP frame-ancestors directive or recognized X-Frame-Options value was detected.", evidence: [xFrame, csp?.hasFrameAncestors ? "CSP frame-ancestors present" : ""].filter((item): item is string => Boolean(item)), recommendation: framingProtected ? "No change is necessary; avoid conflicting framing policies." : "Add an appropriate CSP frame-ancestors directive or X-Frame-Options value based on legitimate embedding needs." }));

  const referrerPolicy = first("referrer-policy");
  const commonReferrerPolicies = new Set(["no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "same-origin", "strict-origin", "strict-origin-when-cross-origin", "unsafe-url"]);
  const referrerRecognized = Boolean(referrerPolicy && referrerPolicy.split(",").some((value) => commonReferrerPolicies.has(value.trim().toLowerCase())));
  checks.push(check({ id: "referrer-policy", status: referrerPolicy ? "passed" : "warning", severity: referrerPolicy ? "passed" : "improvement", description: referrerPolicy ? `A ${referrerRecognized ? "recognized " : "custom or unrecognized "}Referrer-Policy is present: ${referrerPolicy}. Policy choice depends on the site’s functionality and privacy needs.` : "No Referrer-Policy header was detected.", evidence: referrerPolicy ? [referrerPolicy] : [], recommendation: referrerPolicy ? "Confirm the selected policy matches your privacy and attribution requirements." : "Choose and send a Referrer-Policy appropriate for the site’s privacy and integration needs." }));

  const permissionsPolicy = first("permissions-policy");
  checks.push(check({ id: "permissions-policy", status: permissionsPolicy ? "passed" : "info", severity: permissionsPolicy ? "passed" : "improvement", description: permissionsPolicy ? "A Permissions-Policy header limits or declares browser feature access." : "No Permissions-Policy was detected. This is an optional defense-in-depth control.", evidence: permissionsPolicy ? [permissionsPolicy] : [], recommendation: permissionsPolicy ? "Review the allowed features as application requirements change." : "Consider restricting browser features the page does not use." }));

  const crossOriginNames = ["cross-origin-opener-policy", "cross-origin-resource-policy", "cross-origin-embedder-policy"];
  const crossOrigin: Record<string, string> = {};
  crossOriginNames.forEach((name) => { const value = first(name); if (value) crossOrigin[name] = value; });
  const crossStatus: SecurityCheckStatus = Object.keys(crossOrigin).length ? "passed" : "info";
  checks.push(check({ id: "cross-origin", status: crossStatus, severity: severity(crossStatus), description: Object.keys(crossOrigin).length ? `${Object.keys(crossOrigin).length} advanced cross-origin isolation header(s) were detected.` : "No advanced cross-origin isolation headers were detected. They are not required for every website.", evidence: Object.entries(crossOrigin).map(([name, value]) => `${name}: ${value}`), recommendation: Object.keys(crossOrigin).length ? "Confirm these policies support required embeds and cross-origin resources." : "Consider these controls only when the application’s isolation requirements justify them." }));

  const cookieHeaders = all("set-cookie");
  const cookieStats = { count: cookieHeaders.length, secure: 0, httpOnly: 0, sameSite: 0, examples: [] as string[] };
  cookieHeaders.forEach((cookie) => {
    const attributes = cookie.split(";").map((item) => item.trim().toLowerCase());
    if (attributes.includes("secure")) cookieStats.secure += 1;
    if (attributes.includes("httponly")) cookieStats.httpOnly += 1;
    if (attributes.some((item) => item.startsWith("samesite="))) cookieStats.sameSite += 1;
    if (cookieStats.examples.length < EVIDENCE_LIMIT) cookieStats.examples.push(`${cookie.split("=", 1)[0] || "unnamed"}: ${attributes.slice(1).filter((item) => item === "secure" || item === "httponly" || item.startsWith("samesite=")).join(", ") || "no reviewed flags"}`);
  });
  const cookieNeedsReview = cookieStats.count > 0 && ((isHttps && cookieStats.secure < cookieStats.count) || cookieStats.httpOnly < cookieStats.count || cookieStats.sameSite < cookieStats.count);
  checks.push(check({ id: "cookies", status: cookieNeedsReview ? "warning" : "passed", severity: cookieNeedsReview ? "improvement" : "passed", description: !cookieStats.count ? "The main document response did not set cookies." : cookieNeedsReview ? `${cookieStats.count} cookie(s) were set; ${cookieStats.secure} use Secure, ${cookieStats.httpOnly} use HttpOnly, and ${cookieStats.sameSite} declare SameSite. Flag requirements depend on each cookie’s purpose.` : `All ${cookieStats.count} response cookie(s) include the reviewed flags.`, evidence: cookieStats.examples, recommendation: cookieNeedsReview ? "Review each cookie individually. Use Secure on HTTPS where appropriate, HttpOnly for cookies not needed by client scripts, and an intentional SameSite policy." : "No action is indicated by this basic flag review." }));

  const server = first("server");
  const poweredBy = first("x-powered-by");
  const disclosures = [server ? `Server: ${server}` : "", poweredBy ? `X-Powered-By: ${poweredBy}` : ""].filter(Boolean);
  const disclosureStatus: SecurityCheckStatus = disclosures.length ? "info" : "passed";
  checks.push(check({ id: "server-disclosure", status: disclosureStatus, severity: severity(disclosureStatus), description: disclosures.length ? "The response exposes software-identifying headers. This is generally a low-impact information disclosure." : "No common software-identifying response headers were detected.", evidence: disclosures, recommendation: disclosures.length ? "Consider reducing unnecessary version or implementation detail while keeping operationally useful headers." : "No change is necessary." }));

  return {
    score: calculateSecurityScore(checks),
    summary: { passed: checks.filter((item) => item.status === "passed").length, recommendations: checks.filter((item) => item.status === "warning" || item.status === "info").length, important: checks.filter((item) => item.severity === "critical" || item.severity === "important").length },
    headers: { https: isHttps, hsts, csp, xContentTypeOptions: nosniff, referrerPolicy, permissionsPolicy, xFrameOptions: xFrame, crossOrigin, server, poweredBy },
    cookies: cookieStats,
    checks,
    durationMs: Math.round((performance.now() - started) * 100) / 100,
  };
}
