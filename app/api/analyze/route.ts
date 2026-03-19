import googleTrendsApi from "google-trends-api";
import { NextResponse } from "next/server";

import type {
  AnalysisResult,
  Momentum,
  PlatformSignal,
  SignalStrength,
  Trend,
} from "@/lib/analyze";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 100;

type GoogleSignal = {
  score: number;
  label: SignalStrength;
  trend: Trend;
  momentum: Momentum;
  summary: string;
  signal: string;
};

type RedditSignal = {
  score: number;
  label: SignalStrength;
  summary: string;
  signal: string;
};

type TimelinePoint = {
  value?: number[];
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const query =
    payload &&
    typeof payload === "object" &&
    "query" in payload &&
    typeof payload.query === "string"
      ? payload.query.trim()
      : "";

  if (!query) {
    return NextResponse.json(
      { error: "Query is required." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be ${MAX_QUERY_LENGTH} characters or fewer.` },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const [googleResult, redditResult] = await Promise.allSettled([
      getGoogleSignal(query),
      getRedditSignal(query),
    ]);

    const googleSignal =
      googleResult.status === "fulfilled"
        ? googleResult.value
        : fallbackGoogleSignal();
    const redditSignal =
      redditResult.status === "fulfilled"
        ? redditResult.value
        : fallbackRedditSignal();

    if (
      googleResult.status === "rejected" &&
      redditResult.status === "rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "MarketPulse could not retrieve live signals right now. Please try again in a moment.",
        },
        { status: 502, headers: noStoreHeaders },
      );
    }

    const score = Math.round((googleSignal.score + redditSignal.score) / 2);
    const trend = googleSignal.trend;
    const momentum = deriveMomentum(googleSignal, redditSignal);
    const summary = buildSummary(query, trend, momentum, googleSignal, redditSignal);

    const response: AnalysisResult = {
      query,
      score,
      trend,
      google: googleSignal.label,
      reddit: redditSignal.label,
      momentum,
      related: buildRelatedIdeas(query, momentum),
      summary,
      platforms: buildPlatforms(googleSignal, redditSignal, momentum, score),
      sources: {
        googleTrends: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}`,
        reddit: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=top&t=week`,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: noStoreHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "MarketPulse could not complete the analysis right now. Please try again shortly.",
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

async function getGoogleSignal(query: string): Promise<GoogleSignal> {
  const response = await googleTrendsApi.interestOverTime({
    keyword: query,
    startTime: daysAgo(30),
    endTime: new Date(),
  });

  const parsed = JSON.parse(response) as {
    default?: { timelineData?: TimelinePoint[] };
  };
  const timeline = parsed.default?.timelineData ?? [];

  if (timeline.length === 0) {
    throw new Error("No Google Trends data.");
  }

  const values = timeline
    .map((entry) => entry.value?.[0] ?? 0)
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    throw new Error("No Google Trends values.");
  }

  const averageInterest = average(values);
  const third = Math.max(1, Math.floor(values.length / 3));
  const earlyAverage = average(values.slice(0, third));
  const recentAverage = average(values.slice(-third));
  const slope = recentAverage - earlyAverage;
  const slopeScore = clamp(Math.round(((slope + 25) / 50) * 100));
  const trendsScore = clamp(
    Math.round(averageInterest * 0.7 + slopeScore * 0.3),
  );

  return {
    score: trendsScore,
    label: classifyStrength(trendsScore),
    trend: slope >= 8 ? "Rising" : slope <= -8 ? "Declining" : "Stable",
    momentum:
      slope >= 10 ? "Accelerating" : slope <= -10 ? "Slowing" : "Flat",
    summary:
      averageInterest >= 60
        ? "Search demand is healthy, with sustained interest across the past month."
        : averageInterest >= 35
          ? "Search demand is present, though not yet at breakout levels."
          : "Search demand is relatively light, suggesting narrower mainstream pull.",
    signal:
      slope >= 8
        ? "Interest over time is trending upward."
        : slope <= -8
          ? "Interest over time has cooled recently."
          : "Interest over time is holding fairly steady.",
  };
}

async function getRedditSignal(query: string): Promise<RedditSignal> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    query,
  )}&sort=top&t=week&limit=25`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MarketPulse/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Reddit request failed.");
  }

  const payload = (await response.json()) as {
    data?: { children?: Array<{ data?: { score?: number } }> };
  };

  const posts = payload.data?.children ?? [];
  const postCount = posts.length;
  const totalScore = posts.reduce(
    (sum, post) => sum + (post.data?.score ?? 0),
    0,
  );

  const countScore = clamp(Math.round((postCount / 20) * 100));
  const voteScore = clamp(Math.round((totalScore / 1500) * 100));
  const redditScore = clamp(Math.round(countScore * 0.45 + voteScore * 0.55));

  return {
    score: redditScore,
    label: classifyStrength(redditScore),
    summary:
      postCount >= 12
        ? "Reddit discussion is active, with multiple high-signal posts this week."
        : postCount >= 5
          ? "Reddit shows moderate engagement, indicating some real-world discussion."
          : "Reddit discussion is limited, which points to a smaller active conversation set.",
    signal:
      totalScore >= 800
        ? "Community response is strong across top posts."
        : totalScore >= 250
          ? "Community response is present but measured."
          : "Community response is currently light.",
  };
}

function buildPlatforms(
  googleSignal: GoogleSignal,
  redditSignal: RedditSignal,
  momentum: Momentum,
  score: number,
): PlatformSignal[] {
  return [
    {
      name: "Google Trends",
      score: googleSignal.score,
      summary: googleSignal.summary,
      signal: googleSignal.signal,
    },
    {
      name: "Reddit",
      score: redditSignal.score,
      summary: redditSignal.summary,
      signal: redditSignal.signal,
    },
    {
      name: "Momentum",
      score: clamp(
        Math.round(
          score +
            (momentum === "Accelerating" ? 8 : momentum === "Slowing" ? -8 : 0),
        ),
      ),
      summary:
        momentum === "Accelerating"
          ? "Search demand and social discussion are aligning into stronger forward motion."
          : momentum === "Slowing"
            ? "The combined signal is softening, so urgency looks weaker right now."
            : "The combined signal is balanced, with steady attention but limited acceleration.",
      signal:
        momentum === "Accelerating"
          ? "Signals point to growing momentum."
          : momentum === "Slowing"
            ? "Signals point to cooling momentum."
            : "Signals point to a flat demand curve.",
    },
  ];
}

function buildSummary(
  query: string,
  trend: Trend,
  momentum: Momentum,
  googleSignal: GoogleSignal,
  redditSignal: RedditSignal,
): string {
  return `${query} is currently ${trend.toLowerCase()}, with Google Trends showing ${googleSignal.label.toLowerCase()} search demand and Reddit showing ${redditSignal.label.toLowerCase()} discussion strength. Overall momentum looks ${momentum.toLowerCase()}.`;
}

function buildRelatedIdeas(query: string, momentum: Momentum): string[] {
  const prefix = momentum === "Accelerating" ? "Launch angle" : "Test angle";

  return [
    `${prefix}: build a landing page around ${query} and validate conversion intent`,
    `Explore adjacent demand pockets related to ${query}`,
    `Interview people actively discussing ${query} to surface sharper positioning`,
  ];
}

function deriveMomentum(
  googleSignal: GoogleSignal,
  redditSignal: RedditSignal,
): Momentum {
  if (googleSignal.momentum === "Accelerating" && redditSignal.score >= 55) {
    return "Accelerating";
  }

  if (googleSignal.momentum === "Slowing" || redditSignal.score < 35) {
    return "Slowing";
  }

  return "Flat";
}

function classifyStrength(score: number): SignalStrength {
  if (score >= 70) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
}

function fallbackGoogleSignal(): GoogleSignal {
  return {
    score: 50,
    label: "Medium",
    trend: "Stable",
    momentum: "Flat",
    summary:
      "Google Trends data was temporarily unavailable, so this view is using a neutral fallback.",
    signal: "Live search interest could not be retrieved for this run.",
  };
}

function fallbackRedditSignal(): RedditSignal {
  return {
    score: 50,
    label: "Medium",
    summary:
      "Reddit data was temporarily unavailable, so this view is using a neutral fallback.",
    signal: "Live Reddit discussion could not be retrieved for this run.",
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};
