type OverallHealthScoreProps = {
  score: number;
};

export function OverallHealthScore({ score }: OverallHealthScoreProps) {
  const circumference = 2 * Math.PI * 54;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative grid size-36 place-items-center sm:size-40" role="img" aria-label={`Overall website health score: ${score} out of 100`}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1685e6" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} />
        </svg>
        <div className="text-center">
          <span className="text-4xl font-bold tracking-tight text-slate-950">{score}</span>
          <span className="text-lg font-semibold text-slate-400">/100</span>
        </div>
      </div>
      <span className="mt-3 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">Fair health</span>
    </div>
  );
}
