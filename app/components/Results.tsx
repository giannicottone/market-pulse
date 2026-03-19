import type { AnalysisResult } from "@/lib/analyze";

import { PlatformCard } from "./PlatformCard";
import { ScoreCard } from "./ScoreCard";

type ResultsProps = {
  result: AnalysisResult;
  onReset: () => void;
};

export function Results({ result, onReset }: ResultsProps) {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6 sm:gap-8">
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <ScoreCard score={result.score} trend={result.trend} />
        <section className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Summary
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            <span>&ldquo;{result.query}&rdquo;</span> is currently{" "}
            {result.trend.toLowerCase()}
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {result.summary}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <SignalPill label={`Google ${result.google}`} />
            <SignalPill label={`Reddit ${result.reddit}`} />
            <SignalPill label={`Momentum ${result.momentum}`} />
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 sm:w-fit"
          >
            Try another search
          </button>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/85 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
              Platform Signals
            </p>
            <p className="text-sm text-slate-500">Mock product preview</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {result.platforms.map((platform) => (
              <PlatformCard key={platform.name} platform={platform} />
            ))}
          </div>
        </section>

        <section className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Related Ideas
          </p>
          <div className="mt-5 grid flex-1 gap-3">
            {result.related.map((idea) => (
              <div
                key={idea}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 transition duration-200 hover:border-cyan-200 hover:bg-cyan-50/60"
              >
                {idea}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
          Data Sources
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Data derived from public signals
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <SourceLink
            href={result.sources.googleTrends}
            label="View Google Trends"
          />
          <SourceLink
            href={result.sources.reddit}
            label="View Reddit Discussions"
          />
        </div>
      </section>
    </section>
  );
}

function SignalPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
      {label}
    </span>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition duration-200 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 sm:justify-start"
    >
      <span>{label}</span>
      <ExternalLinkIcon />
    </a>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 13 13 7" />
      <path d="M8 7h5v5" />
      <path d="M13 11v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h3" />
    </svg>
  );
}
