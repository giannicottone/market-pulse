import type { PlatformSignal } from "@/lib/analyze";

export function PlatformCard({ platform }: { platform: PlatformSignal }) {
  const badgeTone =
    platform.score >= 75
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : platform.score >= 40
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <article className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-950">{platform.name}</h3>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${badgeTone}`}
        >
          {platform.score}/100
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
        {platform.summary}
      </p>
      <p className="mt-4 text-sm font-medium text-cyan-700">{platform.signal}</p>
    </article>
  );
}
