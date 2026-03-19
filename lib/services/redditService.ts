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
    title?: string;
    selftext?: string;
  };
};

export async function fetchRedditSignal(keyword: string): Promise<RedditSignal> {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
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

  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    trimmedKeyword,
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
  const normalizedKeyword = trimmedKeyword.toLowerCase();
  const normalizeTitle = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const matchesKeyword = (post: RedditChild) => {
    const title = post.data?.title?.toLowerCase() ?? "";
    const selftext = post.data?.selftext?.toLowerCase() ?? "";

    // Require an explicit keyword mention in the title or body to avoid generic hits.
    return title.includes(normalizedKeyword) || selftext.includes(normalizedKeyword);
  };

  // Stage 1: whitelist + explicit keyword relevance filtering.
  const relevantPosts = posts.filter((post) => {
    const subreddit = (post.data?.subreddit ?? "").toLowerCase();

    return (
      appConfig.redditWhitelist.includes(subreddit) &&
      matchesKeyword(post)
    );
  });

  // Stage 2: dedupe exact and near-duplicate titles after normalization.
  const seenTitles = new Set<string>();
  const dedupedPosts = relevantPosts.filter((post) => {
    const normalizedTitle = normalizeTitle(post.data?.title ?? "");

    if (!normalizedTitle || seenTitles.has(normalizedTitle)) {
      return false;
    }

    seenTitles.add(normalizedTitle);
    return true;
  });

  // Stage 3: keep only posts that meet the minimum Reddit quality threshold.
  const highSignalPosts = dedupedPosts.filter(
    (post) => Math.max(0, post.data?.score ?? 0) >= appConfig.redditMinScore,
  );

  // Stage 4: compute weighted engagement with guarded math.
  const rawEngagementValues = highSignalPosts.map((post) => {
    const score = Math.max(0, post.data?.score ?? 0);
    const comments = Math.max(0, post.data?.num_comments ?? 0);

    return 0.7 * score + 0.3 * comments;
  });

  // Small samples are too fragile for percentile capping, so fall back to the max.
  const percentile95 =
    rawEngagementValues.length === 0
      ? 0
      : rawEngagementValues.length < 10
        ? Math.max(...rawEngagementValues)
        : calculatePercentile(rawEngagementValues, 0.95);

  // Stage 5: cap outliers, then apply log scaling to compress viral spikes.
  const cappedEngagementValues = rawEngagementValues.map((value) =>
    Math.min(value, percentile95),
  );
  const engagementScores = cappedEngagementValues.map((value) =>
    Math.log(Math.max(0, value) + 1),
  );
  const averageEngagementScore =
    engagementScores.length > 0 ? average(engagementScores) : 0;

  // Slightly softer scaling keeps normalization from saturating too quickly.
  const safeAverageEngagementScore = Number.isFinite(averageEngagementScore)
    ? averageEngagementScore
    : 0;
  const normalizedValue = roundToTwoDecimals(
    sigmoid(safeAverageEngagementScore / 6),
  );
  const confidence = roundToTwoDecimals(
    Math.min(1, highSignalPosts.length / 10),
  );
  const adjustedScore = roundToTwoDecimals(normalizedValue * confidence);

  return {
    normalizedValue,
    adjustedScore,
    confidence,
    matchedPosts: highSignalPosts.length,
    filteredPosts: posts.length - highSignalPosts.length,
    averageEngagementScore: roundToTwoDecimals(safeAverageEngagementScore),
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
