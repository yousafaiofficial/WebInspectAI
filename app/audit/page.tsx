import type { Metadata } from "next";
import { AuditExperience } from "./audit-experience";

export const metadata: Metadata = { title: "Auditing website" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return <AuditExperience url={url || "https://example.com"} />;
}
