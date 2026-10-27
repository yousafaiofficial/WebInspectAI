export type AuditViewport = {
  id: "mobile-small" | "mobile-large" | "tablet" | "desktop";
  name: string;
  width: number;
  height: number;
  kind: "mobile" | "tablet" | "desktop";
  captureScreenshot: boolean;
};

export const AUDIT_VIEWPORTS: readonly AuditViewport[] = [
  { id: "mobile-small", name: "Mobile small", width: 375, height: 667, kind: "mobile", captureScreenshot: true },
  { id: "mobile-large", name: "Mobile large", width: 390, height: 844, kind: "mobile", captureScreenshot: false },
  { id: "tablet", name: "Tablet", width: 768, height: 1024, kind: "tablet", captureScreenshot: true },
  { id: "desktop", name: "Desktop reference", width: 1440, height: 900, kind: "desktop", captureScreenshot: true },
] as const;
