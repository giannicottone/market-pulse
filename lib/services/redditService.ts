import { appConfig } from "@/lib/config";
import { fetchWithRetry } from "@/lib/services/requestUtils";

export type RedditSignal = {
  normalizedValue: number;
  adjustedScore: number;
  confidence: number;
  matchedPosts: number;
  filteredPosts: number;
  averageEngagementScore: number;
  outlierProtected: boolean;
};

type RedditChild = {
  data?: {
    score?: number;
    num_comments?: number;
    subreddit?: string;
  };
};

export async function fetchRedditSignal(keyword: string): Promise<RedditSignal> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    keyword,
  )}&sort=top&t=week&limit=25`;

  const response = await fetchWithRetry(url, {
    headers: {
      "User-Agent": "MarketPulse/1.0",
      Accept: "application/json",
    },
  });

  const payload = (await safeParseJson(response)) as {
    data?: { children?: RedditChild[] };
  };

  const posts = payload.data?.children ?? [];
  const whitelistedPosts = posts.filter((post) =>
    appConfig.redditWhitelist.includes(
      (post.data?.subreddit ?? "").toLowerCase(),
    ),
  );

  const highSignalPosts = whitelistedPosts.filter(
    (post) => (post.data?.score ?? 0) >= appConfig.redditMinScore,
  );

  const rawEngagementValues = highSignalPosts.map(
    (post) => (post.data?.score ?? 0) + (post.data?.num_comments ?? 0),
  );
  const percentile95 = calculatePercentile(rawEngagementValues, 0.95);
  const cappedEngagementValues = rawEngagementValues.map((value) =>
    Math.min(value, percentile95),
  );
  const engagementScores = cappedEngagementValues.map((value) =>
    Math.log(value + 1),
  );
  const averageEngagementScore =
    engagementScores.length > 0 ? average(engagementScores) : 0;
  const normalizedValue = roundToTwoDecimals(sigmoid(averageEngagementScore / 5));
  const confidence = roundToTwoDecimals(Math.min(1, highSignalPosts.length / 5));
  const adjustedScore = roundToTwoDecimals(normalizedValue * confidence);

  return {
    normalizedValue,
    adjustedScore,
    confidence,
    matchedPosts: highSignalPosts.length,
    filteredPosts: posts.length - highSignalPosts.length,
    averageEngagementScore: roundToTwoDecimals(averageEngagementScore),
    outlierProtected: rawEngagementValues.some((value) => value > percentile95),
  };
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error("Reddit returned an invalid JSON payload");
  }
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function calculatePercentile(values: number[], percentile: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * percentile) - 1);

  return sorted[index];
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
