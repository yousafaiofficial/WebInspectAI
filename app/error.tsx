"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client runtime exceptions in production
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[65vh] items-center justify-center bg-mist px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-100 text-xl font-bold text-red-600">
          !
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          An unexpected error occurred while loading this view. You can try refreshing or head back to the home page.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Home
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
