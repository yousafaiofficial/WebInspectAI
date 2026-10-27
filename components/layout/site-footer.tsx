import Link from "next/link";
import { Logo } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-slate-500">Clear website checks. Practical fixes.</p>
        </div>
        <div className="flex gap-6 text-sm text-slate-500">
          <Link href="/#faq" className="hover:text-slate-900">FAQ</Link>
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
