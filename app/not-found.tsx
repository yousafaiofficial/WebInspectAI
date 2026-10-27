import Link from "next/link";
import { ArrowRightIcon, ShieldIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center bg-mist px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-100">
          <ShieldIcon className="size-7" />
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">404</h1>
        <h2 className="mt-2 text-xl font-bold text-slate-800">Page not found</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you are looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Back to homepage
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
