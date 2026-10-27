import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | WebInspectAI",
  description: "Privacy policy for WebInspectAI.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 sm:px-6">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-slate">
        <p>Your privacy is important to us. This page explains our data practices.</p>
        <h2>What we collect</h2>
        <p>Submitted public website URLs are processed to perform audits. Standard server/analytics logs may be collected for operational purposes.</p>
        <h2>Third-party AI</h2>
        <p>Third-party AI may receive bounded audit evidence if AI features are enabled. Secrets, cookies, and private browser data are not intentionally sent to AI.</p>
      </div>
    </div>
  );
}
