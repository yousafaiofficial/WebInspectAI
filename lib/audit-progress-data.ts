import type { AuditStep } from "./audit-types";

export const auditSteps: AuditStep[] = [
  { id: "load", label: "Loading website" },
  { id: "seo", label: "Analyzing SEO" },
  { id: "security", label: "Checking security" },
  { id: "links", label: "Checking links" },
  { id: "accessibility", label: "Testing accessibility" },
  { id: "mobile", label: "Testing mobile layout" },
  { id: "performance", label: "Measuring performance" },
  { id: "ui-ux", label: "Analyzing UI/UX" },
  { id: "report", label: "Preparing report" },
];
