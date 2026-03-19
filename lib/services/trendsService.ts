import googleTrendsApi from "google-trends-api";

import { appConfig } from "@/lib/config";

export type TrendsSignal = {
  normalizedValue: number;
  averageInterest: number;
  recentAverageInterest: number;
  currentInterest: number;
  peakInterest: number;
  momentum: number;
  variance: number;
  trend: "rising" | "stable" | "declining";
};

export async function fetchTrendsSignal(keyword: string): Promise<TrendsSignal> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= appConfig.retryAttempts; attempt += 1) {
    try {
      const response = await withTimeout(
        googleTrendsApi.interestOverTime({
          keyword,
          startTime: daysAgo(30),
          endTime: new Date(),
        }),
        appConfig.requestTimeoutMs,
      );

      const parsed = JSON.parse(response) as {
        default?: { timelineData?: Array<{ value?: number[] }> };
      };
      const values =
        parsed.default?.timelineData
          ?.map((entry) => entry.value?.[0] ?? 0)
          .filter((value) => Number.isFinite(value)) ?? [];

      if (values.length === 0) {
        throw new Error("No Google Trends values returned");
      }

      const averageInterest = average(values);
      const sliceSize = Math.max(1, Math.floor(values.length / 3));
      const head = average(values.slice(0, sliceSize));
      const tail = average(values.slice(-sliceSize));
      const recentValues = values.slice(-Math.max(1, Math.floor(values.length / 4)));
      const momentum = (tail - head) / Math.max(head, 1);
      const normalizedValue = clamp(
        roundToTwoDecimals(
          (averageInterest / 100) * 0.7 + sigmoid(momentum) * 0.3,
        ),
      );
      const variance = roundToTwoDecimals(calculateVariance(values));

      return {
        normalizedValue,
        averageInterest: roundToTwoDecimals(averageInterest),
        recentAverageInterest: roundToTwoDecimals(average(recentValues)),
        currentInterest: roundToTwoDecimals(values.at(-1) ?? 0),
        peakInterest: roundToTwoDecimals(Math.max(...values)),
        momentum: roundToTwoDecimals(momentum),
        variance,
        trend:
          momentum > 0.15 ? "rising" : momentum < -0.15 ? "declining" : "stable",
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Trends request failed");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Google Trends request timed out"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function calculateVariance(values: number[]) {
  const mean = average(values);
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
