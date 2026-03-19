import type { AnalysisResult, Breakdown, Trend } from "@/lib/analyze";

type BuildScoreInput = {
  query: string;
  google: {
    normalizedValue: number;
    averageInterest: number;
    recentAverageInterest: number;
    currentInterest: number;
    peakInterest: number;
    momentum: number;
    variance: number;
    trend: Trend;
  };
  youtube: {
    normalizedValue: number;
    adjustedScore: number;
    confidence: number;
    matchedVideos: number;
    averageEngagementScore: number;
    averageViews: number;
    averageLikes: number;
    averageComments: number;
    topVideoViews: number;
  };
};

const BASE_WEIGHTS = {
  google: 0.55,
  youtube: 0.45,
} as const;

export function buildAnalysisResult({
  query,
  google,
  youtube,
}: BuildScoreInput): AnalysisResult {
  const googleScore = roundToTwoDecimals(google.normalizedValue * 100);
  const youtubeScore = roundToTwoDecimals(youtube.adjustedScore * 100);

  const googleValid = google.variance > 0 && google.normalizedValue > 0;
  const youtubeValid = youtube.matchedVideos >= 5 && youtube.adjustedScore > 0;
  const validSourceCount = Number(googleValid) + Number(youtubeValid);
  const redistributedWeights = redistributeWeights({
    google: googleValid,
    youtube: youtubeValid,
  });

  const baseConfidence = Math.max(
    0,
    Math.min(
      1,
      weightedAverage([
        { value: googleConfidence(google.variance), weight: redistributedWeights.google },
        { value: youtube.confidence, weight: redistributedWeights.youtube },
      ]),
    ),
  );

  let totalScore = 0;
  let confidence = 0;
  let agreement = 1;

  if (validSourceCount === 1) {
    totalScore =
      weightedAverage([
        { value: googleScore, weight: redistributedWeights.google },
        { value: youtubeScore, weight: redistributedWeights.youtube },
      ]) * 0.6;
    confidence = baseConfidence * 0.6;
  } else if (validSourceCount === 2) {
    totalScore = weightedAverage([
      { value: googleScore, weight: redistributedWeights.google },
      { value: youtubeScore, weight: redistributedWeights.youtube },
    ]);

    // Reward coherence between demand and engagement without overcorrecting.
    agreement = Math.max(0, 1 - Math.abs(google.normalizedValue - youtube.normalizedValue));
    totalScore *= 0.8 + 0.2 * agreement;
    confidence = baseConfidence;
  }

  const breakdown: Breakdown = {
    totalScore: roundToTwoDecimals(totalScore),
    weights: redistributedWeights,
    sources: {
      google: googleScore,
      youtube: youtubeScore,
    },
  };

  const flags: string[] = [];

  if (google.variance > 700) {
    flags.push("High variance detected in trends data");
  }

  if (youtube.matchedVideos > 0 && youtube.matchedVideos < 5) {
    flags.push("Low YouTube sample size");
  }

  if (youtube.normalizedValue >= 0.65 && google.normalizedValue < 0.35) {
    flags.push("High attention with softer search demand");
  }

  if (google.normalizedValue >= 0.65 && youtube.normalizedValue < 0.35) {
    flags.push("Search demand without strong video engagement");
  }

  if (validSourceCount === 1) {
    flags.push("Single source signal (lower reliability)");
  }

  if (validSourceCount === 2 && agreement < 0.5) {
    flags.push("Sources disagree significantly");
  }

  const roundedConfidence = roundToTwoDecimals(
    Math.max(0, Math.min(1, validSourceCount === 0 ? 0 : confidence)),
  );

  return {
    query,
    score: Math.round(breakdown.totalScore),
    trend: google.trend,
    confidence: roundedConfidence,
    breakdown,
    sources: [
      {
        platform: "google",
        link: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}`,
      },
      {
        platform: "youtube",
        link: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      },
    ],
    diagnostics: {
      google: {
        averageInterest: google.averageInterest,
        recentAverageInterest: google.recentAverageInterest,
        currentInterest: google.currentInterest,
        peakInterest: google.peakInterest,
        momentum: google.momentum,
        variance: google.variance,
        normalizedValue: google.normalizedValue,
      },
      youtube: {
        matchedVideos: youtube.matchedVideos,
        averageEngagementScore: youtube.averageEngagementScore,
        averageViews: youtube.averageViews,
        averageLikes: youtube.averageLikes,
        averageComments: youtube.averageComments,
        topVideoViews: youtube.topVideoViews,
        normalizedValue: youtube.normalizedValue,
      },
    },
    flags,
    summary: buildSummary(
      query,
      google,
      youtube,
      validSourceCount,
      roundedConfidence,
    ),
  };
}

function redistributeWeights(validity: Record<keyof typeof BASE_WEIGHTS, boolean>) {
  const validWeightTotal = Object.entries(BASE_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (validity[key as keyof typeof BASE_WEIGHTS] ? weight : 0),
    0,
  );

  if (validWeightTotal === 0) {
    return {
      google: 0,
      youtube: 0,
    };
  }

  return {
    google: validity.google ? roundToTwoDecimals(BASE_WEIGHTS.google / validWeightTotal) : 0,
    youtube: validity.youtube ? roundToTwoDecimals(BASE_WEIGHTS.youtube / validWeightTotal) : 0,
  };
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  return (
    values.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight
  );
}

function googleConfidence(variance: number) {
  return Math.max(0, Math.min(1, 1 - variance / 1200));
}

function buildSummary(
  query: string,
  google: BuildScoreInput["google"],
  youtube: BuildScoreInput["youtube"],
  validSourceCount: number,
  confidence: number,
) {
  if (validSourceCount === 0) {
    return `${query} shows no reliable demand signal because both search demand and video engagement data were insufficient. Confidence is 0%.`;
  }

  const demandDescription = describeLevel(google.normalizedValue, "search demand");
  const engagementDescription = describeLevel(youtube.normalizedValue, "video engagement");

  if (validSourceCount === 1) {
    return `${query} shows ${demandDescription} and ${engagementDescription}, but the result relies on a single valid source so reliability is reduced to ${(confidence * 100).toFixed(0)}%.`;
  }

  if (google.normalizedValue >= 0.65 && youtube.normalizedValue < 0.35) {
    return `${query} shows ${demandDescription} but weaker ${engagementDescription}, suggesting curiosity or early research rather than strong audience follow-through. Confidence is ${(confidence * 100).toFixed(0)}%.`;
  }

  if (youtube.normalizedValue >= 0.65 && google.normalizedValue < 0.35) {
    return `${query} shows ${engagementDescription} but softer ${demandDescription}, suggesting audience attention that is not yet fully translating into broad search demand. Confidence is ${(confidence * 100).toFixed(0)}%.`;
  }

  return `${query} shows ${demandDescription} and ${engagementDescription}, with ${(confidence * 100).toFixed(0)}% confidence across search demand and audience attention signals.`;
}

function describeLevel(value: number, label: string) {
  if (value >= 0.7) {
    return `strong ${label}`;
  }

  if (value >= 0.4) {
    return `moderate ${label}`;
  }

  return `low ${label}`;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
