import type { AnalysisResult } from "@/lib/analyze";

type ScoreCardProps = {
  score: AnalysisResult["score"];
  trend: AnalysisResult["trend"];
};

export function ScoreCard({ score, trend }: ScoreCardProps) {
  const scoreTone =
    score >= 75
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score >= 40
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  const ringTone =
    score >= 75
      ? "ring-emerald-200 shadow-[0_0_0_18px_rgba(16,185,129,0.10)]"
      : score >= 40
        ? "ring-amber-200 shadow-[0_0_0_18px_rgba(245,158,11,0.10)]"
        : "ring-rose-200 shadow-[0_0_0_18px_rgba(244,63,94,0.10)]";

  const progressTone =
    score >= 75
      ? "from-emerald-400 to-emerald-600"
      : score >= 40
        ? "from-amber-400 to-amber-500"
        : "from-rose-400 to-rose-500";

  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.10)]">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
        Market Score
      </p>
      <div className="mt-6 flex flex-1 flex-col items-center justify-center">
        <div
          className={`flex h-40 w-40 items-center justify-center rounded-full bg-white ring-8 transition duration-300 sm:h-48 sm:w-48 ${ringTone}`}
        >
          <div className="text-center">
            <p className="text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            {score}
            </p>
            <p className="mt-2 text-sm text-slate-500">out of 100</p>
          </div>
        </div>
        <div
          className={`mt-6 rounded-full border px-4 py-2 text-sm font-semibold ${scoreTone}`}
        >
          Trend: {trend.charAt(0).toUpperCase() + trend.slice(1)}
        </div>
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-linear-to-r ${progressTone} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </section>
  );
}
