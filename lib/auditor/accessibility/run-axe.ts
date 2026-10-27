import "server-only";
import axe, { type AxeResults } from "axe-core";
import type { Page } from "playwright";
import { AccessibilityAuditError } from "./accessibility-errors";

export async function runAxe(page: Page): Promise<AxeResults> {
  try { await page.addScriptTag({ content: axe.source }); }
  catch { throw new AccessibilityAuditError("AXE_INJECTION_FAILED", "The accessibility engine could not be loaded into the page."); }
  try {
    return await page.evaluate(async () => {
      const engine = (window as unknown as { axe: { run: (root: Document, options: object) => Promise<AxeResults> } }).axe;
      return engine.run(document, {
        resultTypes: ["violations", "passes", "incomplete"],
        rules: {
          "duplicate-id-aria": { enabled: true },
          "duplicate-id-active": { enabled: true },
        },
      });
    });
  } catch {
    throw new AccessibilityAuditError("AXE_EXECUTION_FAILED", "The accessibility checks could not be completed on this page.");
  }
}
