type PlatformCardProps = {
  label: string;
  normalizedValue: number;
  detail: string;
  helper: string;
};

export function PlatformCard({
  label,
  normalizedValue,
  detail,
  helper,
}: PlatformCardProps) {
  const tone =
    normalizedValue >= 0.7
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalizedValue >= 0.4
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-950">{label}</h3>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${tone}`}
        >
          {(normalizedValue * 100).toFixed(0)} / 100
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">{detail}</p>
      <p className="mt-4 text-sm font-medium text-cyan-700">{helper}</p>
    </article>
  );
}
