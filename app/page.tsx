"use client";

import { useEffect, useRef, useState } from "react";

import { LoadingState } from "@/app/components/LoadingState";
import { Results } from "@/app/components/Results";
import { SearchBar } from "@/app/components/SearchBar";
import type { AnalysisResult, ApiResponse } from "@/lib/analyze";

type ViewState = "idle" | "loading" | "results";

export default function Home() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [view, setView] = useState<ViewState>("idle");
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const requestIdRef = useRef(0);

  const clearTimers = () => {
    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    timeoutRefs.current = [];
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  async function handleAnalyze() {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    clearTimers();
    setSubmittedQuery(normalizedQuery);
    setError(null);
    setIsPanelVisible(false);

    timeoutRefs.current.push(
      window.setTimeout(() => {
        setView("loading");
        setResult(null);
        setIsPanelVisible(true);
      }, 180),
    );

    try {
      const [response] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: normalizedQuery }),
        }),
        wait(2400),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const payload = await safeParseJson(response);

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success ? "Unable to analyze this query." : payload.error,
        );
      }

      setIsPanelVisible(false);

      timeoutRefs.current.push(
        window.setTimeout(() => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setResult(payload.data);
          setView("results");
          setIsPanelVisible(true);
        }, 220),
      );
    } catch (analysisError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setIsPanelVisible(false);

      timeoutRefs.current.push(
        window.setTimeout(() => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setView("idle");
          setResult(null);
          setError(
            analysisError instanceof Error
              ? analysisError.message
              : "Unable to analyze this query.",
          );
          setIsPanelVisible(true);
        }, 220),
      );
    }
  }

  function handleReset() {
    clearTimers();
    requestIdRef.current += 1;
    setQuery("");
    setSubmittedQuery("");
    setResult(null);
    setError(null);
    setView("idle");
    setIsPanelVisible(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10 lg:p-12">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_58%)]" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center">
          <div className="inline-flex items-center rounded-full border border-cyan-100 bg-cyan-50/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-800">
            Market Validation Assistant
          </div>
          <h1 className="mt-7 text-center text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
            MarketPulse
          </h1>
          <p className="mt-6 max-w-2xl text-center text-base leading-8 text-slate-600 sm:text-lg">
            Validate market interest before you build or spend
          </p>

          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleAnalyze}
            isLoading={view === "loading"}
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              Try: AI interview prep
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              DTC electrolyte powder
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              B2B expense automation
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-10 w-full max-w-5xl sm:mt-14">
          <div
            key={view === "results" ? `results-${submittedQuery}` : view}
            className={`transition-opacity duration-300 ${
              isPanelVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {view === "loading" ? (
              <LoadingState query={submittedQuery} />
            ) : view === "results" && result ? (
              <Results result={result} onReset={handleReset} />
            ) : (
              <section className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center sm:px-8 sm:py-12">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
                  Instant Market Read
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Search a topic to preview demand and conversation strength
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  MarketPulse turns a simple query into a fast product-style
                  snapshot with a score, trend signal, source breakdown, and
                  confidence-backed diagnostics.
                </p>
                {error ? (
                  <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">
                    {error}
                  </div>
                ) : null}
              </section>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function wait(duration: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

async function safeParseJson(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    throw new Error("MarketPulse returned an invalid response payload.");
  }
}
