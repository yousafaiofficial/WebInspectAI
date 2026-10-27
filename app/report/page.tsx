import type { Metadata } from "next";
import { ReportView } from "./report-view";

export const metadata: Metadata = { title: "Website Health Report" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return <ReportView initialUrl={url} />;
}
