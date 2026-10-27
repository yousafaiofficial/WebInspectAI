import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

import { env } from "@/lib/config/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.BASE_URL),
  title: {
    default: "WebInspectAI — Free Website Tester & Audit Tool",
    template: "%s | WebInspectAI",
  },
  description: "Test your website for performance, SEO, accessibility, mobile usability, broken links, security issues and UX problems.",
  openGraph: {
    title: "WebInspectAI — Free Website Tester & Audit Tool",
    description: "Test your website for performance, SEO, accessibility, mobile usability, broken links, security issues and UX problems.",
    url: env.BASE_URL,
    siteName: "WebInspectAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WebInspectAI — Free Website Tester & Audit Tool",
    description: "Test your website for performance, SEO, accessibility, mobile usability, broken links, security issues and UX problems.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
