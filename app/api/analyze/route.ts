import { NextResponse } from "next/server";

import type { AnalysisResult, ApiResponse } from "@/lib/analyze";
import { appConfig } from "@/lib/config";
import {
  clearInFlightValue,
  getCachedValue,
  getInFlightValue,
  setCachedValue,
  setInFlightValue,
} from "@/lib/services/cacheService";
import { fetchRedditSignal } from "@/lib/services/redditService";
import {
  buildAnalysisResult,
  buildUnavailableRedditSignal,
} from "@/lib/services/scoringService";
import { fetchTrendsSignal } from "@/lib/services/trendsService";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 100;

export async function POST(request: Request) {
  const parsedRequest = await parseAnalyzeRequest(request);

  if (!parsedRequest.success) {
    return respondError(400, parsedRequest.error.message);
  }

  const query = parsedRequest.data.query;
  const cacheKey = query.toLowerCase();

  const cachedResult = getCachedValue<AnalysisResult>(cacheKey);
  if (cachedResult) {
    if (!isCacheableResult(cachedResult)) {
      console.warn("market-pulse invalid cached result", { keyword: cacheKey });
    } else {
      console.info("market-pulse cache hit", { keyword: cacheKey });
      return respondSuccess(cachedResult);
    }
  }

  console.info("market-pulse cache miss", { keyword: cacheKey });

  const inFlightResult = getInFlightValue<AnalysisResult>(cacheKey);
  if (inFlightResult) {
    console.info("market-pulse in-flight reuse", { keyword: cacheKey });

    try {
      const reusedResult = await inFlightResult;

      if (!isCacheableResult(reusedResult)) {
        return respondError(
          502,
          "MarketPulse produced an invalid analysis result.",
        );
      }

      return respondSuccess(reusedResult);
    } catch (error) {
      console.error("market-pulse in-flight failure", {
        keyword: cacheKey,
        error: getErrorMessage(error),
      });

      return respondError(
        502,
        getErrorMessage(error),
      );
    }
  }

  const analysisPromise = buildLiveAnalysis(query);
  setInFlightValue(cacheKey, analysisPromise);

  try {
    const result = await analysisPromise;

    if (!isCacheableResult(result)) {
      console.error("market-pulse invalid analysis result", {
        keyword: cacheKey,
        score: result.score,
        google: result.breakdown.sources.google,
        reddit: result.breakdown.sources.reddit,
      });

      return respondError(
        502,
        "MarketPulse produced an invalid analysis result.",
      );
    }

    setCachedValue(cacheKey, result, appConfig.cacheTtlMs);
    return respondSuccess(result);
  } catch (error) {
    console.error("market-pulse upstream failure", {
      keyword: cacheKey,
      error: getErrorMessage(error),
    });

    return respondError(
      502,
      getErrorMessage(error),
    );
  } finally {
    clearInFlightValue(cacheKey);
  }
}

async function buildLiveAnalysis(query: string): Promise<AnalysisResult> {
  console.info("market-pulse analyze", { query });

  let google;

  try {
    google = await fetchTrendsSignal(query);
  } catch (error) {
    console.error("market-pulse required source failure", {
      query,
      source: "google",
      error: getErrorMessage(error),
    });

    throw new Error("Google Trends data unavailable");
  }

  let reddit = buildUnavailableRedditSignal();
  let redditUnavailable = false;

  try {
    reddit = await fetchRedditSignal(query);
  } catch (error) {
    redditUnavailable = true;
    console.warn("market-pulse partial failure", {
      query,
      source: "reddit",
      error: getErrorMessage(error),
    });
  }

  const result = buildAnalysisResult({
    query,
    google,
    reddit,
  });

  if (redditUnavailable) {
    result.flags.push("Reddit data unavailable");
  }

  return result;
}

async function parseAnalyzeRequest(
  request: Request,
): Promise<
  | { success: true; data: { query: string } }
  | { success: false; error: { code: string; message: string } }
> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON payload.",
      },
    };
  }

  const query =
    payload &&
    typeof payload === "object" &&
    "query" in payload &&
    typeof payload.query === "string"
      ? payload.query.trim()
      : "";

  if (!query) {
    return {
      success: false,
      error: {
        code: "INVALID_QUERY",
        message: "Query is required.",
      },
    };
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return {
      success: false,
      error: {
        code: "INVALID_QUERY",
        message: `Query must be ${MAX_QUERY_LENGTH} characters or fewer.`,
      },
    };
  }

  if (hasExcessiveRepetition(query)) {
    return {
      success: false,
      error: {
        code: "INVALID_QUERY",
        message: "Query contains excessively repetitive characters.",
      },
    };
  }

  return {
    success: true,
    data: {
      query,
    },
  };
}

function respondSuccess(result: AnalysisResult) {
  const payload: ApiResponse = {
    success: true,
    data: result,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: noStoreHeaders,
  });
}

function respondError(status: number, message: string) {
  const payload: ApiResponse = {
    success: false,
    error: message,
  };

  return NextResponse.json(payload, {
    status,
    headers: noStoreHeaders,
  });
}

function hasExcessiveRepetition(value: string) {
  const normalized = value.trim().toLowerCase();
  return /(.)\1{7,}/.test(normalized);
}

function isCacheableResult(result: AnalysisResult) {
  return (
    Number.isFinite(result.score) &&
    Number.isFinite(result.confidence) &&
    isNormalized(result.breakdown.totalScore) &&
    isNormalized(result.breakdown.sources.google) &&
    isNormalized(result.breakdown.sources.reddit)
  );
}

function isNormalized(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "MarketPulse could not complete the analysis right now.";
}

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};
