import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | WebInspectAI",
  description: "Terms of service for WebInspectAI.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 sm:px-6">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose prose-slate">
        <p>By using WebInspectAI, you agree to these terms.</p>
        <h2>Authorization</h2>
        <p>Users must own or have permission to test websites where authorization is required.</p>
        <h2>Limitations</h2>
        <p>Automated audit results are informational. We make no guarantee of complete security, accessibility, or SEO compliance based on these results.</p>
      </div>
    </div>
  );
}
