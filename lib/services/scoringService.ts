import { appConfig } from "@/lib/config";
import type { AnalysisResult, Breakdown, Trend } from "@/lib/analyze";

type BuildScoreInput = {
  query: string;
  google: {
    normalizedValue: number;
    averageInterest: number;
    momentum: number;
    variance: number;
    trend: Trend;
  };
  reddit: {
    normalizedValue: number;
    adjustedScore: number;
    confidence: number;
    matchedPosts: number;
    filteredPosts: number;
    averageEngagementScore: number;
    outlierProtected: boolean;
  };
};

export function buildAnalysisResult({
  query,
  google,
  reddit,
}: BuildScoreInput): AnalysisResult {
  const googleScore = roundToTwoDecimals(google.normalizedValue * 100);
  const redditScore = roundToTwoDecimals(reddit.adjustedScore * 100);
  const breakdown: Breakdown = {
    totalScore: roundToTwoDecimals(
      googleScore * appConfig.googleWeight +
        redditScore * appConfig.redditWeight,
    ),
    weights: {
      google: appConfig.googleWeight,
      reddit: appConfig.redditWeight,
    },
    sources: {
      google: googleScore,
      reddit: redditScore,
    },
  };

  const flags: string[] = [];

  if (reddit.adjustedScore > 0.8 && google.normalizedValue < 0.3) {
    flags.push("Possible Reddit skew detected for a broad or generic keyword");
  }

  if (reddit.matchedPosts === 0) {
    flags.push("Reddit signal is limited after whitelist and quality filters");
  }

  if (reddit.matchedPosts < 3) {
    flags.push("Low sample size on Reddit");
  }

  if (google.variance > 700) {
    flags.push("High variance detected in trends data");
  }

  if (reddit.outlierProtected) {
    flags.push("Possible outlier-driven Reddit signal");
  }

  const trendConfidence = Math.max(
    0,
    Math.min(1, 1 - google.variance / 1200),
  );
  const confidence = roundToTwoDecimals(
    Math.max(0, Math.min(1, reddit.confidence * 0.5 + trendConfidence * 0.5)),
  );

  return {
    query,
    score: Math.round(breakdown.totalScore),
    trend: google.trend,
    confidence,
    breakdown,
    sources: [
      {
        platform: "google",
        link: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}`,
      },
      {
        platform: "reddit",
        link: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=top&t=week`,
      },
    ],
    diagnostics: {
      google: {
        averageInterest: google.averageInterest,
        momentum: google.momentum,
        variance: google.variance,
        normalizedValue: google.normalizedValue,
      },
      reddit: {
        matchedPosts: reddit.matchedPosts,
        filteredPosts: reddit.filteredPosts,
        averageEngagementScore: reddit.averageEngagementScore,
        adjustedScore: reddit.adjustedScore,
        normalizedValue: reddit.normalizedValue,
      },
    },
    flags,
    summary: buildSummary(query, breakdown, google.trend, confidence),
  };
}

export function buildUnavailableRedditSignal() {
  return {
    normalizedValue: 0,
    adjustedScore: 0,
    confidence: 0,
    matchedPosts: 0,
    filteredPosts: 0,
    averageEngagementScore: 0,
    outlierProtected: false,
  };
}

function buildSummary(
  query: string,
  breakdown: Breakdown,
  trend: Trend,
  confidence: number,
) {
  return `${query} shows a ${trend} signal with ${(confidence * 100).toFixed(0)}% confidence. Google contributes ${breakdown.sources.google.toFixed(1)} points and Reddit contributes ${breakdown.sources.reddit.toFixed(1)} points under the current weighting model.`;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
