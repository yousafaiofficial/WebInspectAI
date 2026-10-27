import "server-only";
import type { Page } from "playwright";
import type { AuditViewport } from "../../browser/viewport-config";
import { MOBILE_LIMITS } from "./mobile-rules";
import type { MobileViewportResult } from "./mobile-types";

export async function inspectViewport(page: Page, viewport: AuditViewport, started: number): Promise<MobileViewportResult> {
  const inspection = await page.evaluate(({ width, height, tolerance, evidenceLimit, elementLimit, tinyText, smallTarget, spacing, overlayRatio }) => {
    // tsx preserves local function names with an internal helper. Playwright
    // serializes this callback into the page, so provide the no-op equivalent.
    const pageGlobal = globalThis as typeof globalThis & { __name?: (value: unknown) => unknown };
    pageGlobal.__name ||= Function("value", "return value") as (value: unknown) => unknown;
    type Evidence = { selector: string; width: number; height: number; detail: string };
    const evidence = {
      "outside-viewport": [] as Evidence[], "oversized-media": [] as Evidence[], "fixed-width": [] as Evidence[], "tiny-text": [] as Evidence[],
      "small-targets": [] as Evidence[], "target-spacing": [] as Evidence[], "content-clipping": [] as Evidence[], "mobile-navigation": [] as Evidence[],
      "form-usability": [] as Evidence[], "fixed-overlay": [] as Evidence[],
    };
    const counts = { outsideViewport: 0, oversizedMedia: 0, fixedWidth: 0, tinyText: 0, smallTapTargets: 0, tightTapSpacing: 0, clipped: 0, navigation: 0, form: 0, overlays: 0 };
    const selector = (element: Element) => {
      const html = element as HTMLElement;
      if (html.id) return `${element.tagName.toLowerCase()}#${CSS.escape(html.id)}`.slice(0, 160);
      const classes = Array.from(element.classList).slice(0, 2).map((item) => `.${CSS.escape(item)}`).join("");
      return `${element.tagName.toLowerCase()}${classes}`.slice(0, 160);
    };
    const add = (key: keyof typeof evidence, element: Element, detail: string) => {
      if (evidence[key].length >= evidenceLimit) return;
      const rect = element.getBoundingClientRect();
      evidence[key].push({ selector: selector(element), width: Math.round(rect.width), height: Math.round(rect.height), detail });
    };
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const elements = Array.from(document.querySelectorAll("body *")).slice(0, elementLimit);
    const interactive: Array<{ element: Element; rect: DOMRect }> = [];
    for (const element of elements) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const outside = rect.right > width + tolerance || rect.left < -tolerance;
      if (outside) { counts.outsideViewport += 1; add("outside-viewport", element, `Bounds ${Math.round(rect.left)}px to ${Math.round(rect.right)}px exceed the ${width}px viewport`); }
      const media = element.matches("img,video,iframe,svg,canvas");
      const parentWidth = element.parentElement?.getBoundingClientRect().width || width;
      if (media && (rect.width > width + tolerance || rect.width > parentWidth + tolerance)) { counts.oversizedMedia += 1; add("oversized-media", element, `Media is ${Math.round(rect.width)}px wide inside a ${Math.round(parentWidth)}px area`); }
      const minWidth = Number.parseFloat(style.minWidth);
      if (!media && outside && (rect.width > width + tolerance || (Number.isFinite(minWidth) && minWidth > width + tolerance))) { counts.fixedWidth += 1; add("fixed-width", element, `Rendered width or min-width forces content beyond ${width}px`); }
      const directText = Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()));
      const fontSize = Number.parseFloat(style.fontSize);
      if (directText && fontSize < tinyText) { counts.tinyText += 1; add("tiny-text", element, `Visible text uses a ${fontSize}px computed font size`); }
      if ((style.overflowX === "hidden" || style.overflowX === "clip" || style.overflowY === "hidden" || style.overflowY === "clip") && (element.scrollWidth > element.clientWidth + tolerance || element.scrollHeight > element.clientHeight + tolerance) && (directText || element.matches("input,select,textarea,button,a"))) { counts.clipped += 1; add("content-clipping", element, `Content dimensions ${element.scrollWidth}×${element.scrollHeight} exceed its ${element.clientWidth}×${element.clientHeight} box`); }
      if (element.matches("nav") && (outside || element.scrollWidth > element.clientWidth + tolerance)) { counts.navigation += 1; add("mobile-navigation", element, "Navigation extends outside or is clipped by its rendered box"); }
      if (element.matches("input:not([type=hidden]),select,textarea")) {
        const tooNarrow = rect.width < 60;
        if (outside || rect.width > width + tolerance || tooNarrow) { counts.form += 1; add("form-usability", element, tooNarrow ? "Form control is extremely narrow" : "Form control extends beyond the viewport"); }
      }
      if (style.position === "fixed" || style.position === "sticky") {
        const visibleWidth = Math.max(0, Math.min(width, rect.right) - Math.max(0, rect.left));
        const visibleHeight = Math.max(0, Math.min(height, rect.bottom) - Math.max(0, rect.top));
        const ratio = (visibleWidth * visibleHeight) / (width * height);
        if (ratio >= overlayRatio) { counts.overlays += 1; add("fixed-overlay", element, `Fixed or sticky element covers ${Math.round(ratio * 100)}% of the viewport`); }
      }
      if (element.matches("a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[tabindex]:not([tabindex='-1'])")) {
        interactive.push({ element, rect });
        if (rect.width < smallTarget && rect.height < smallTarget) { counts.smallTapTargets += 1; add("small-targets", element, `Tap area is ${Math.round(rect.width)}×${Math.round(rect.height)}px`); }
      }
    }
    for (let index = 1; index < interactive.length; index += 1) {
      const previous = interactive[index - 1];
      const current = interactive[index];
      const horizontalGap = Math.max(0, Math.max(previous.rect.left, current.rect.left) - Math.min(previous.rect.right, current.rect.right));
      const verticalGap = Math.max(0, Math.max(previous.rect.top, current.rect.top) - Math.min(previous.rect.bottom, current.rect.bottom));
      const overlapsOnX = previous.rect.left < current.rect.right && previous.rect.right > current.rect.left;
      const overlapsOnY = previous.rect.top < current.rect.bottom && previous.rect.bottom > current.rect.top;
      if ((overlapsOnX && verticalGap < spacing) || (overlapsOnY && horizontalGap < spacing)) { counts.tightTapSpacing += 1; add("target-spacing", current.element, "Adjacent interactive controls overlap or have under 2px spacing"); }
    }
    return { documentWidth, horizontalOverflow: documentWidth > width + tolerance, overflowPixels: Math.max(0, documentWidth - width), counts, evidence };
  }, {
    width: viewport.width, height: viewport.height, tolerance: MOBILE_LIMITS.overflowTolerancePx, evidenceLimit: MOBILE_LIMITS.evidencePerRule,
    elementLimit: MOBILE_LIMITS.maximumElementsInspected, tinyText: MOBILE_LIMITS.tinyTextPx, smallTarget: MOBILE_LIMITS.smallTapTargetPx,
    spacing: MOBILE_LIMITS.tapSpacingPx, overlayRatio: MOBILE_LIMITS.overlayViewportRatio,
  });
  return { ...viewport, ...inspection, renderDurationMs: Math.round(performance.now() - started) };
}
