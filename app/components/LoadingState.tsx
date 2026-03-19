"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Analyzing search trends...",
  "Scanning discussions...",
  "Calculating signal strength...",
];

export function LoadingState({ query }: { query: string }) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveStage((currentStage) =>
        currentStage < STAGES.length - 1 ? currentStage + 1 : currentStage,
      );
    }, 800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] sm:px-8 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
        Running analysis
      </p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        Building a signal snapshot for <span>&ldquo;{query}&rdquo;</span>
      </h2>
      <div className="mt-8 grid gap-3">
        {STAGES.map((stage, index) => {
          const isActive = index <= activeStage;

          return (
            <div
              key={stage}
              className={`rounded-2xl border px-4 py-4 text-sm transition duration-300 ${
                isActive
                  ? "translate-x-0 border-cyan-400 bg-cyan-400/10 text-white shadow-[0_10px_24px_rgba(34,211,238,0.10)]"
                  : "translate-x-0 border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-cyan-200">
                {index + 1}
              </span>
              {stage}
            </div>
          );
        })}
      </div>
      <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${((activeStage + 1) / STAGES.length) * 100}%` }}
        />
      </div>
    </section>
  );
}
