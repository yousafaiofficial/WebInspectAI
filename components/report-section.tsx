import type { ReactNode } from "react";

type ReportSectionProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  id?: string;
};

export function ReportSection({ title, description, aside, children, id }: ReportSectionProps) {
  return (
    <section id={id} className="rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
