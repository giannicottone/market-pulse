import { fetchWithRetry } from "@/lib/services/requestUtils";

export type YouTubeSignal = {
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

type SearchItem = {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
  };
};

type VideoItem = {
  id?: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

const YOUTUBE_MAX_RESULTS = 25;

export async function fetchYouTubeSignal(
  keyword: string,
): Promise<YouTubeSignal> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return buildUnavailableYouTubeSignal();
  }

  if (!apiKey) {
    throw new Error("YouTube API key is not configured");
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("q", trimmedKeyword);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", String(YOUTUBE_MAX_RESULTS));
  searchUrl.searchParams.set("key", apiKey);

  const searchResponse = await fetchWithRetry(searchUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  const searchPayload = (await safeParseJson(searchResponse)) as {
    items?: SearchItem[];
  };
  const normalizedKeyword = trimmedKeyword.toLowerCase();
  const searchItems = searchPayload.items ?? [];

  // Keep only videos that explicitly mention the keyword in title/description.
  const relevantItems = searchItems.filter((item) => {
    const haystack = `${item.snippet?.title ?? ""} ${item.snippet?.description ?? ""}`.toLowerCase();
    return haystack.includes(normalizedKeyword);
  });
  const videoIds = relevantItems
    .map((item) => item.id?.videoId?.trim() ?? "")
    .filter(Boolean);

  if (videoIds.length === 0) {
    return buildUnavailableYouTubeSignal();
  }

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "statistics");
  videosUrl.searchParams.set("id", videoIds.join(","));
  videosUrl.searchParams.set("key", apiKey);

  const videosResponse = await fetchWithRetry(videosUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  const videosPayload = (await safeParseJson(videosResponse)) as {
    items?: VideoItem[];
  };
  const statisticsById = new Map(
    (videosPayload.items ?? []).map((item) => [item.id ?? "", item.statistics]),
  );

  const videoStats = videoIds
    .map((videoId) => statisticsById.get(videoId))
    .filter((statistics): statistics is NonNullable<typeof statistics> =>
      Boolean(statistics),
    )
    .map((statistics) => {
      const views = safeCount(statistics.viewCount);
      const likes = safeCount(statistics.likeCount);
      const comments = safeCount(statistics.commentCount);

      return {
        views,
        likes,
        comments,
        engagement:
          Math.log(views + 1) * 0.6 + Math.log(likes + comments + 1) * 0.4,
      };
    });

  if (videoStats.length === 0) {
    return buildUnavailableYouTubeSignal();
  }

  const engagementScores = videoStats
    .map((item) => item.engagement)
    .filter(Number.isFinite);

  if (engagementScores.length === 0) {
    return buildUnavailableYouTubeSignal();
  }

  const averageEngagementScore = average(engagementScores);
  const normalizedValue = roundToTwoDecimals(
    sigmoid(averageEngagementScore / 6),
  );
  const confidence = roundToTwoDecimals(
    Math.min(1, engagementScores.length / 10),
  );
  const adjustedScore = roundToTwoDecimals(normalizedValue * confidence);

  return {
    normalizedValue,
    adjustedScore,
    confidence,
    matchedVideos: engagementScores.length,
    averageEngagementScore: roundToTwoDecimals(averageEngagementScore),
    averageViews: roundToTwoDecimals(average(videoStats.map((item) => item.views))),
    averageLikes: roundToTwoDecimals(average(videoStats.map((item) => item.likes))),
    averageComments: roundToTwoDecimals(
      average(videoStats.map((item) => item.comments)),
    ),
    topVideoViews: roundToTwoDecimals(
      Math.max(...videoStats.map((item) => item.views)),
    ),
  };
}

export function buildUnavailableYouTubeSignal(): YouTubeSignal {
  return {
    normalizedValue: 0,
    adjustedScore: 0,
    confidence: 0,
    matchedVideos: 0,
    averageEngagementScore: 0,
    averageViews: 0,
    averageLikes: 0,
    averageComments: 0,
    topVideoViews: 0,
  };
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error("YouTube returned an invalid JSON payload");
  }
}

function safeCount(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
