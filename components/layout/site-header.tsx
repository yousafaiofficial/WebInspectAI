import Link from "next/link";
import { GlobeIcon } from "@/components/icons";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="WebInspectAI home">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm transition group-hover:bg-brand-700">
        <GlobeIcon className="size-5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">WebInspect<span className="text-brand-600">AI</span></span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-slate-200/80 bg-white/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 sm:flex" aria-label="Main navigation">
          <Link href="/#checks" className="transition hover:text-slate-950">What we check</Link>
          <Link href="/#how-it-works" className="transition hover:text-slate-950">How it works</Link>
          <Link href="/#faq" className="transition hover:text-slate-950">FAQ</Link>
        </nav>
        <Link href="/#website-test" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
          Run a free test
        </Link>
      </div>
    </header>
  );
}
