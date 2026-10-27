"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, GlobeIcon } from "@/components/icons";

type UrlInputProps = {
  defaultValue?: string;
  compact?: boolean;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function UrlInput({ defaultValue = "", compact = false }: UrlInputProps) {
  const router = useRouter();
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!authorized) {
      setError("Confirm that you have permission to test this website.");
      return;
    }
    const normalized = normalizeUrl(url);

    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes(".")) throw new Error("Invalid domain");
      setError("");
      setLoading(true);
      router.push(`/audit?url=${encodeURIComponent(normalized)}`);
    } catch {
      setError("Enter a valid website address, like https://example.com");
    }
  }

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div className={`flex flex-col rounded-2xl border bg-white p-2 shadow-panel transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 sm:flex-row ${error ? "border-red-300" : "border-slate-200"}`}>
        <div className="flex min-w-0 flex-1 items-center">
          <GlobeIcon className="ml-3 size-5 shrink-0 text-slate-400" />
          <label htmlFor="website-url" className="sr-only">Website URL</label>
          <input
            id="website-url"
            name="url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            aria-describedby={error ? "url-error" : undefined}
            aria-invalid={Boolean(error)}
            className={`min-w-0 flex-1 border-0 bg-transparent px-3 text-slate-900 outline-none placeholder:text-slate-400 ${compact ? "h-11 text-base" : "h-12 text-base sm:h-14 sm:text-lg"}`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white shadow-sm transition hover:bg-brand-700 active:translate-y-px disabled:opacity-80 disabled:cursor-not-allowed ${compact ? "h-11 px-5 text-sm" : "h-12 px-6 sm:h-14 sm:text-base"}`}
        >
          {loading ? "Starting Audit…" : "Test My Website"}
          <ArrowRightIcon className="size-5" />
        </button>
      </div>
      {error && <p id="url-error" role="alert" className="mt-2 pl-1 text-left text-sm font-medium text-red-600">{error}</p>}
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 pl-1 text-left text-sm text-slate-600">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(event) => { setAuthorized(event.target.checked); if (event.target.checked) setError(""); }}
          className="mt-0.5 size-4 rounded border-slate-300 accent-brand-600"
        />
        <span>I own this website or have permission to test it.</span>
      </label>
    </form>
  );
}
