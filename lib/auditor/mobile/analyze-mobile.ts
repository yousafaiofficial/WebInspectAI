import "server-only";
import type { HostResolver } from "../../url/resolve-host";
import { resolveHost } from "../../url/resolve-host";
import { validatePublicUrl } from "../../url/validate-public-url";
import { createBrowser, withIsolatedPage, type BrowserLauncher } from "../../browser/create-browser";
import { configureSafeNavigation } from "../../browser/safe-navigation";
import { AUDIT_VIEWPORTS } from "../../browser/viewport-config";
import { MobileAuditError } from "./mobile-errors";
import { MOBILE_LIMITS } from "./mobile-rules";
import { calculateMobileScore } from "./mobile-score";
import { inspectViewport } from "./inspect-viewport";
import type { MobileAuditInput, MobileAuditResponse, MobileAuditResult, MobileEvidence, MobileFinding, MobileRuleId, MobileViewportResult } from "./mobile-types";

type CountKey = keyof MobileViewportResult["counts"];

function aggregateFinding(options: {
  id: MobileRuleId; countKey?: CountKey; title: string; description: (count: number) => string; severity: MobileFinding["severity"];
  why: string; recommendation: string; viewports: MobileViewportResult[];
}): MobileFinding | null {
  const affected = options.countKey ? options.viewports.filter((viewport) => viewport.counts[options.countKey!] > 0) : options.viewports.filter((viewport) => viewport.horizontalOverflow);
  if (!affected.length) return null;
  const count = options.countKey ? affected.reduce((sum, viewport) => sum + viewport.counts[options.countKey!], 0) : affected.length;
  const evidenceKey = options.id as Exclude<MobileRuleId, "viewport-meta" | "horizontal-overflow">;
  const evidence: string[] = [];
  if (options.id === "horizontal-overflow") affected.forEach((viewport) => evidence.push(`${viewport.width}px viewport: document is ${viewport.documentWidth}px wide`));
  else affected.forEach((viewport) => viewport.evidence[evidenceKey].forEach((item: MobileEvidence) => {
    if (evidence.length < MOBILE_LIMITS.evidencePerRule) evidence.push(`${viewport.width}px · ${item.selector}: ${item.detail}`);
  }));
  return { id: `mobile-${options.id}`, severity: options.severity, title: options.title, description: options.description(count), evidence, whyItMatters: options.why, recommendation: options.recommendation, viewports: affected.map((viewport) => `${viewport.name} (${viewport.width}px)`) };
}

function buildFindings(hasViewportMeta: boolean, viewports: MobileViewportResult[]): MobileFinding[] {
  const responsiveViewports = viewports.filter((viewport) => viewport.kind !== "desktop");
  const findings: Array<MobileFinding | null> = [];
  if (!hasViewportMeta) findings.push({ id: "mobile-viewport-meta", severity: "important", title: "Viewport metadata is missing", description: "The page has no viewport declaration, which can cause mobile browsers to render a desktop-width layout.", evidence: [], whyItMatters: "Without an appropriate viewport, responsive styles may not map to the device width as intended.", recommendation: "Add a viewport meta tag such as width=device-width, initial-scale=1.", viewports: viewports.filter((item) => item.kind === "mobile").map((item) => `${item.name} (${item.width}px)`) });
  const definitions: Array<Parameters<typeof aggregateFinding>[0]> = [
    { id: "horizontal-overflow", title: "Horizontal overflow detected", description: (count) => `${count} tested mobile or tablet viewport${count === 1 ? " is" : "s are"} wider than the visible page area.`, severity: "important", why: "Visitors may need to scroll sideways or may be unable to reach off-screen content.", recommendation: "Use fluid widths, responsive wrapping, and media queries; inspect the listed oversized elements.", viewports: responsiveViewports },
    { id: "outside-viewport", countKey: "outsideViewport", title: "Elements extend outside the viewport", description: (count) => `${count} rendered element occurrence${count === 1 ? " extends" : "s extend"} beyond horizontal page bounds.`, severity: "important", why: "Off-screen controls or content can become difficult or impossible to use on narrow screens.", recommendation: "Constrain element widths and positioning at affected breakpoints.", viewports },
    { id: "oversized-media", countKey: "oversizedMedia", title: "Media exceeds its layout area", description: (count) => `${count} media element occurrence${count === 1 ? " is" : "s are"} wider than the viewport or containing layout area.`, severity: "improvement", why: "Oversized media commonly causes horizontal scrolling and obscured content.", recommendation: "Apply responsive media sizing such as max-width: 100% and preserve aspect ratios.", viewports },
    { id: "fixed-width", countKey: "fixedWidth", title: "Fixed-width layout causes overflow", description: (count) => `${count} likely fixed-width container occurrence${count === 1 ? " contributes" : "s contribute"} to measurable overflow.`, severity: "important", why: "Rigid containers prevent layouts from adapting to small screens.", recommendation: "Replace overflowing fixed or minimum widths with bounded fluid sizing at mobile breakpoints.", viewports },
    { id: "tiny-text", countKey: "tinyText", title: "Very small mobile text detected", description: (count) => `${count} visible text occurrence${count === 1 ? " uses" : "s use"} a computed font size below ${MOBILE_LIMITS.tinyTextPx}px.`, severity: "improvement", why: "Very small text can be difficult to read, though font-size heuristics do not prove readability.", recommendation: "Review these regions on real devices and increase text size where it affects reading comfort.", viewports },
    { id: "small-targets", countKey: "smallTapTargets", title: "Small tap targets detected", description: (count) => `${count} interactive element occurrence${count === 1 ? " has" : "s have"} both width and height below ${MOBILE_LIMITS.smallTapTargetPx}px.`, severity: "improvement", why: "Very small controls can be harder to activate accurately on touchscreens; no single size is universally required.", recommendation: "Increase the interactive area or spacing for frequently used mobile controls.", viewports },
    { id: "target-spacing", countKey: "tightTapSpacing", title: "Interactive controls are extremely close", description: (count) => `${count} adjacent control pair occurrence${count === 1 ? " has" : "s have"} overlapping or under ${MOBILE_LIMITS.tapSpacingPx}px spacing.`, severity: "improvement", why: "Extremely close targets can increase accidental activation.", recommendation: "Add conservative spacing between adjacent mobile controls.", viewports },
    { id: "content-clipping", countKey: "clipped", title: "Content appears measurably clipped", description: (count) => `${count} text or control occurrence${count === 1 ? " exceeds" : "s exceed"} a hidden-overflow container.`, severity: "important", why: "Clipped text and controls may be partially inaccessible.", recommendation: "Allow content to wrap or expand, and avoid fixed heights that hide meaningful content.", viewports },
    { id: "mobile-navigation", countKey: "navigation", title: "Navigation does not fit its rendered area", description: (count) => `${count} navigation occurrence${count === 1 ? " extends" : "s extend"} outside or is clipped by its box.`, severity: "important", why: "Visitors may not be able to reach important destinations.", recommendation: "Let navigation wrap, scroll intentionally, or use an accessible compact pattern at affected widths.", viewports },
    { id: "form-usability", countKey: "form", title: "Form controls do not fit mobile layouts", description: (count) => `${count} form control occurrence${count === 1 ? " is" : "s are"} off-screen, overflowing, or extremely narrow.`, severity: "important", why: "Poorly sized form fields make data entry difficult on mobile devices.", recommendation: "Use responsive control widths and verify fields remain fully visible and usable.", viewports },
    { id: "fixed-overlay", countKey: "overlays", title: "Large fixed overlay covers mobile content", description: (count) => `${count} fixed or sticky element occurrence${count === 1 ? " covers" : "s cover"} at least ${Math.round(MOBILE_LIMITS.overlayViewportRatio * 100)}% of a viewport.`, severity: "important", why: "Large persistent overlays can obstruct content and controls on small screens.", recommendation: "Reduce overlay dimensions on mobile and provide an obvious way to dismiss nonessential overlays.", viewports },
  ];
  definitions.forEach((definition) => { definition.viewports = responsiveViewports; });
  definitions.forEach((definition) => findings.push(aggregateFinding(definition)));
  const actual = findings.filter((finding): finding is MobileFinding => Boolean(finding)).slice(0, MOBILE_LIMITS.maximumFindings);
  if (!actual.length) actual.push({ id: "mobile-responsive", severity: "passed", title: "Responsive checks passed", description: "No significant responsive-layout issues were detected at the tested viewports.", evidence: [], whyItMatters: "The page fit the tested viewport widths with usable baseline dimensions.", recommendation: "Continue validating responsive behavior when layouts or content change.", viewports: viewports.map((viewport) => `${viewport.name} (${viewport.width}px)`) });
  return actual;
}

export type MobileDependencies = { resolver?: HostResolver; launch?: BrowserLauncher; navigationTimeoutMs?: number; totalTimeoutMs?: number; renderingGraceMs?: number };

export async function analyzeMobile(input: MobileAuditInput, dependencies: MobileDependencies = {}): Promise<MobileAuditResult> {
  const started = performance.now();
  const resolver = dependencies.resolver || resolveHost;
  try { await validatePublicUrl(input.finalUrl, resolver); }
  catch { throw new MobileAuditError("UNSAFE_NAVIGATION_BLOCKED", "The responsive browser was prevented from opening a private or unsafe address."); }
  let taskEntered = false;
  try {
    return await withIsolatedPage(async (page, context) => {
      taskEntered = true;
      const safety = await configureSafeNavigation({ page, context, finalUrl: input.finalUrl, html: input.html, resolver });
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new MobileAuditError("AUDIT_TIMEOUT", "The responsive audit exceeded its total time limit.")), dependencies.totalTimeoutMs ?? MOBILE_LIMITS.totalTimeoutMs); });
      const audit = async () => {
        const viewports: MobileViewportResult[] = [];
        let screenshotsCaptured = 0;
        for (const viewport of AUDIT_VIEWPORTS) {
          const viewportStarted = performance.now();
          try {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            safety.allowPrimaryNavigation();
            await page.goto(input.finalUrl, { waitUntil: "domcontentloaded", timeout: dependencies.navigationTimeoutMs ?? MOBILE_LIMITS.navigationTimeoutMs });
          } catch (error) {
            if ((error as Error).name === "TimeoutError") throw new MobileAuditError("NAVIGATION_TIMEOUT", `The page took too long to render at the ${viewport.name} viewport.`);
            throw new MobileAuditError("VIEWPORT_RENDER_FAILED", `The page could not be rendered at the ${viewport.name} viewport.`);
          }
          await page.waitForTimeout(dependencies.renderingGraceMs ?? MOBILE_LIMITS.renderingGraceMs);
          if (safety.unsafeMainNavigation) throw new MobileAuditError("UNSAFE_NAVIGATION_BLOCKED", "The page attempted to navigate the responsive browser to an unsafe address.");
          try { viewports.push(await inspectViewport(page, viewport, viewportStarted)); }
          catch (error) { throw new MobileAuditError("LAYOUT_INSPECTION_FAILED", `Layout measurements failed at the ${viewport.name} viewport.`, error); }
          if (viewport.captureScreenshot && screenshotsCaptured < MOBILE_LIMITS.screenshots) {
            try { await page.screenshot({ type: "jpeg", quality: 60, fullPage: false }); screenshotsCaptured += 1; }
            catch { throw new MobileAuditError("SCREENSHOT_FAILED", `Viewport evidence could not be captured at the ${viewport.name} viewport.`); }
          }
          await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* Storage may be unavailable. */ } });
          await context.clearCookies();
        }
        return {
          score: calculateMobileScore({ hasViewportMeta: input.hasViewportMeta, viewports }),
          summary: {
            viewportsTested: viewports.length,
            overflowIssues: viewports.filter((viewport) => viewport.horizontalOverflow).length,
            smallTapTargets: viewports.reduce((sum, viewport) => sum + viewport.counts.smallTapTargets, 0),
            tinyTextIssues: viewports.reduce((sum, viewport) => sum + viewport.counts.tinyText, 0),
            clippedElements: viewports.reduce((sum, viewport) => sum + viewport.counts.clipped, 0),
            overlayIssues: viewports.reduce((sum, viewport) => sum + viewport.counts.overlays, 0),
          },
          viewports,
          findings: buildFindings(input.hasViewportMeta, viewports),
          metadata: { engine: "playwright" as const, durationMs: Math.round(performance.now() - started), screenshotsCaptured, screenshotsPersisted: false as const, blockedRequests: safety.blockedRequests },
        };
      };
      try { return await Promise.race([audit(), deadline]); }
      finally { if (timeout) clearTimeout(timeout); }
    }, dependencies.launch || createBrowser);
  } catch (error) {
    if (error instanceof MobileAuditError) throw error;
    if (!taskEntered) throw new MobileAuditError("BROWSER_LAUNCH_FAILED", "The responsive browser could not be started.");
    throw new MobileAuditError("LAYOUT_INSPECTION_FAILED", "The responsive layout audit could not be completed.");
  }
}

export async function analyzeMobileSafe(input: MobileAuditInput, dependencies: MobileDependencies = {}): Promise<MobileAuditResponse> {
  try { return { available: true, result: await analyzeMobile(input, dependencies) }; }
  catch (error) {
    if (error instanceof MobileAuditError) return { available: false, error: { code: error.code, message: error.message } };
    return { available: false, error: { code: "LAYOUT_INSPECTION_FAILED", message: "The responsive layout audit could not be completed." } };
  }
}
