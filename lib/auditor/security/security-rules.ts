import type { SecurityRuleId } from "./security-types";

export const SECURITY_RULES: Record<SecurityRuleId, { title: string; weight: number }> = {
  https: { title: "HTTPS transport", weight: 20 },
  hsts: { title: "Strict Transport Security", weight: 14 },
  csp: { title: "Content Security Policy", weight: 18 },
  nosniff: { title: "Content type protection", weight: 10 },
  framing: { title: "Framing protection", weight: 10 },
  "referrer-policy": { title: "Referrer Policy", weight: 8 },
  "permissions-policy": { title: "Permissions Policy", weight: 5 },
  cookies: { title: "Cookie flags", weight: 6 },
  "cross-origin": { title: "Cross-origin isolation", weight: 4 },
  "server-disclosure": { title: "Software disclosure", weight: 5 },
};
