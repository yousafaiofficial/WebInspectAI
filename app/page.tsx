import Link from "next/link";
import { ArrowRightIcon, CheckIcon, SearchIcon, ShieldIcon } from "@/components/icons";
import { UrlInput } from "@/components/url-input";

const checkedAreas = ["Performance", "SEO", "Accessibility", "Mobile", "Security", "UI/UX", "Broken Links"];

const features = [
  { number: "01", title: "Enter any public URL", text: "Start with your homepage or a key landing page. No account or installation required." },
  { number: "02", title: "We check the essentials", text: "One clear audit covers the technical, search, usability, and trust signals that matter." },
  { number: "03", title: "Get practical next steps", text: "See prioritized findings with plain-language impact and a recommended fix for every issue." },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ url?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const defaultUrl = resolved.url || "";

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-white" id="website-test">
        <div className="absolute inset-x-0 top-0 -z-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(22,133,230,0.09),transparent_63%)]" />
        <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28 lg:pt-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" />
            Free website health check
          </div>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
            Test Your Website. <span className="text-brand-600">Find What’s Wrong.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-slate-600 sm:text-xl">
            Free AI-powered website testing for performance, SEO, accessibility, mobile, security and UX.
          </p>
          <div className="mx-auto mt-10 max-w-3xl">
            <UrlInput defaultValue={defaultUrl} />
            <p className="mt-3 text-sm text-slate-500">No signup required · Results in seconds · We don’t store your data</p>
          </div>
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-3" aria-label="Areas we check">
            {checkedAreas.map((area) => (
              <span key={area} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <CheckIcon className="size-4 text-emerald-600" />{area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="checks" className="bg-mist py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">One audit, clear answers</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Know what to fix next</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">WebInspectAI turns a wide range of website signals into a focused health report. Important problems rise to the top, with enough context to take action.</p>
              <Link href="#website-test" className="mt-7 inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600">Test your website <ArrowRightIcon className="size-5" /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><SearchIcon className="size-6" /></span>
                <h3 className="mt-5 font-bold text-slate-900">Search & performance</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Surface slow assets, missing metadata, and technical SEO gaps that limit visibility.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldIcon className="size-6" /></span>
                <h3 className="mt-5 font-bold text-slate-900">Experience & trust</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Catch accessibility, mobile, security, broken-link, and usability issues.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Example health score</p>
                    <p className="mt-1 text-4xl font-bold tracking-tight text-slate-950">76<span className="text-xl text-slate-400">/100</span></p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[76%] rounded-full bg-brand-500" /></div>
                    <p className="mt-2 text-right text-xs font-semibold text-slate-500">6 categories analyzed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">From URL to action plan</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="relative border-t border-slate-200 pt-6">
                <span className="text-sm font-bold text-brand-600">{feature.number}</span>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-slate-200 bg-slate-950 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-8 px-5 text-center sm:px-6 lg:flex-row lg:text-left">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Your next improvement starts here.</h2>
            <p className="mt-2 text-slate-400">Run a free test and see where your website needs attention.</p>
          </div>
          <Link href="#website-test" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100">Run a free test <ArrowRightIcon className="size-5" /></Link>
        </div>
      </section>
    </>
  );
}
