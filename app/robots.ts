import { env } from "@/lib/config/env";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/audit", "/report"],
    },
    sitemap: `${env.BASE_URL}/sitemap.xml`,
  };
}
