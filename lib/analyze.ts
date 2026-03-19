export type Trend = "rising" | "stable" | "declining";

export type SourceKey = "google" | "reddit";

export type SourceLink = {
  platform: SourceKey;
  link: string;
};

export type Breakdown = {
  totalScore: number;
  weights: {
    google: number;
    reddit: number;
  };
  sources: {
    google: number;
    reddit: number;
  };
};

export type AnalysisResult = {
  query: string;
  score: number;
  trend: Trend;
  confidence: number;
  breakdown: Breakdown;
  sources: SourceLink[];
  diagnostics: {
    google: {
      averageInterest: number;
      momentum: number;
      variance: number;
      normalizedValue: number;
    };
    reddit: {
      matchedPosts: number;
      filteredPosts: number;
      averageEngagementScore: number;
      adjustedScore: number;
      normalizedValue: number;
    };
  };
  flags: string[];
  summary: string;
};

export type ApiSuccessResponse = {
  success: true;
  data: AnalysisResult;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
};

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;
