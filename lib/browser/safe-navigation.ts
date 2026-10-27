import "server-only";
import type { BrowserContext, Page } from "playwright";
import type { HostResolver } from "../url/resolve-host";
import { resolveHost } from "../url/resolve-host";
import { requestUrlSafely } from "../fetcher/safe-request";
import { validatePublicUrl } from "../url/validate-public-url";
import { ACCESSIBILITY_LIMITS } from "../auditor/accessibility/accessibility-rules";

export type NavigationSafetyState = { blockedRequests: number; unsafeMainNavigation?: string; allowPrimaryNavigation: () => void };

function fulfillmentHeaders(headers: Record<string, string | string[] | undefined>) {
  const excluded = new Set(["connection", "content-encoding", "content-length", "set-cookie", "transfer-encoding"]);
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined && !excluded.has(name.toLowerCase())) result[name] = Array.isArray(value) ? value.join(", ") : value;
  }
  return result;
}

export async function configureSafeNavigation(options: { page: Page; context: BrowserContext; finalUrl: string; html: string; resolver?: HostResolver }) {
  const { page, context, finalUrl, html } = options;
  const resolver = options.resolver || resolveHost;
  const expected = new URL(finalUrl); expected.hash = "";
  let primaryNavigationAllowed = true;
  let subresourceRequests = 0;
  let subresourceBytes = 0;
  const state: NavigationSafetyState = { blockedRequests: 0, allowPrimaryNavigation: () => { primaryNavigationAllowed = true; } };

  await context.route("**/*", async (route) => {
    const request = route.request();
    let target: URL;
    try { target = new URL(request.url()); } catch { state.blockedRequests += 1; await route.abort("blockedbyclient"); return; }
    target.hash = "";

    if (primaryNavigationAllowed && request.isNavigationRequest() && request.frame() === page.mainFrame() && target.toString() === expected.toString()) {
      primaryNavigationAllowed = false;
      await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
      return;
    }
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      state.blockedRequests += 1;
      try {
        if (!["http:", "https:"].includes(target.protocol)) throw new Error("unsupported");
        await validatePublicUrl(target, resolver);
      } catch { state.unsafeMainNavigation = request.url(); }
      await route.abort("blockedbyclient");
      return;
    }
    if (!["http:", "https:"].includes(target.protocol) || !["GET", "HEAD"].includes(request.method())) {
      state.blockedRequests += 1;
      await route.abort("blockedbyclient");
      return;
    }
    if (["image", "media"].includes(request.resourceType()) || subresourceRequests >= ACCESSIBILITY_LIMITS.maximumSubresourceRequests) {
      state.blockedRequests += 1;
      await route.abort("blockedbyclient");
      return;
    }

    subresourceRequests += 1;
    try {
      const resource = await requestUrlSafely(target.toString(), {
        resolver,
        maxRedirects: 5,
        request: {
          method: request.method() as "GET" | "HEAD",
          timeoutMs: ACCESSIBILITY_LIMITS.subresourceTimeoutMs,
          maxResponseBytes: ACCESSIBILITY_LIMITS.maximumSubresourceBytes,
          accept: request.headers().accept || "*/*",
        },
      });
      subresourceBytes += resource.response.body.length;
      if (subresourceBytes > ACCESSIBILITY_LIMITS.maximumTotalSubresourceBytes) {
        state.blockedRequests += 1;
        await route.abort("blockedbyclient");
        return;
      }
      await route.fulfill({ status: resource.response.status, headers: fulfillmentHeaders(resource.response.headers), body: resource.response.body });
    } catch {
      state.blockedRequests += 1;
      await route.abort("blockedbyclient");
    }
  });

  await context.routeWebSocket("**/*", (webSocket) => webSocket.close());
  context.on("page", (newPage) => { if (newPage !== page) void newPage.close().catch(() => undefined); });
  return state;
}
