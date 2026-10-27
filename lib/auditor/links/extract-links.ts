import * as cheerio from "cheerio";
import { normalizeUrl } from "../../url/normalize-url";
import type { ExtractedLinks } from "./link-types";

export function extractLinks(html: string, finalUrl: string): ExtractedLinks {
  const $ = cheerio.load(html);
  const base = new URL(finalUrl);
  const unique = new Map<string, { url: string; internal: boolean }>();
  const result: ExtractedLinks = { anchors: 0, httpLinks: [], hashOnly: 0, empty: 0, mailto: 0, tel: 0, unsupported: 0 };

  $("a").each((_, element) => {
    result.anchors += 1;
    const href = ($(element).attr("href") || "").trim();
    if (!href) { result.empty += 1; return; }
    if (href.startsWith("#")) { result.hashOnly += 1; return; }
    const lower = href.toLowerCase();
    if (lower.startsWith("mailto:")) { result.mailto += 1; return; }
    if (lower.startsWith("tel:")) { result.tel += 1; return; }

    let resolved: URL;
    try { resolved = new URL(href, base); } catch { result.unsupported += 1; return; }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") { result.unsupported += 1; return; }
    resolved.hash = "";
    try {
      const normalized = normalizeUrl(resolved.toString()).normalizedUrl;
      if (!unique.has(normalized)) unique.set(normalized, { url: normalized, internal: new URL(normalized).origin === base.origin });
    } catch { result.unsupported += 1; }
  });
  result.httpLinks = Array.from(unique.values());
  return result;
}
