export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-mist px-5 py-20 sm:px-6">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto size-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
        <p className="mt-5 text-sm font-semibold text-slate-700">Loading…</p>
        <p className="mt-1 text-xs text-slate-500">Preparing experience</p>
      </div>
    </div>
  );
}
