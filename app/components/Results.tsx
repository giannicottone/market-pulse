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
            {result.trend}
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {result.summary}
          </p>
          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Confidence</span>
              <span className="font-medium">
                {(result.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Google Trends weight</span>
              <span className="font-medium">
                {(result.breakdown.weights.google * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Reddit weight</span>
              <span className="font-medium">
                {(result.breakdown.weights.reddit * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Composite score</span>
              <span className="font-medium">{result.breakdown.totalScore}</span>
            </div>
          </div>
          {result.flags.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              <p className="font-semibold">Flags</p>
              <div className="mt-2 grid gap-2">
                {result.flags.map((flag) => (
                  <p key={flag}>{flag}</p>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onReset}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 sm:w-fit"
          >
            Try another search
          </button>
        </section>
      </div>

      <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/85 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Signal Breakdown
          </p>
          <p className="text-sm text-slate-500">
            Independently normalized 0-1 before weighting
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <PlatformCard
            label="Google Trends"
            normalizedValue={result.breakdown.sources.google / 100}
            detail={`Average interest ${result.diagnostics.google.averageInterest.toFixed(1)} with momentum ${result.diagnostics.google.momentum.toFixed(2)}`}
            helper={`Composite normalization with variance ${result.diagnostics.google.variance.toFixed(1)}`}
          />
          <PlatformCard
            label="Reddit"
            normalizedValue={result.breakdown.sources.reddit / 100}
            detail={`${result.diagnostics.reddit.matchedPosts} matched posts, ${result.diagnostics.reddit.filteredPosts} filtered`}
            helper={`Average log engagement ${result.diagnostics.reddit.averageEngagementScore.toFixed(2)} | adjusted ${(result.diagnostics.reddit.adjustedScore * 100).toFixed(0)}/100`}
          />
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
          Data Sources
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Source links for the normalized inputs used in scoring
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {result.sources.map((source) => (
            <SourceLink
              key={source.platform}
              href={source.link}
              label={
                source.platform === "google"
                  ? "View Google Trends"
                  : "View Reddit Discussions"
              }
            />
          ))}
        </div>
      </section>
    </section>
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
