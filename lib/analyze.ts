export type Trend = "rising" | "stable" | "declining";

export type SourceKey = "google" | "youtube";

export type SourceLink = {
  platform: SourceKey;
  link: string;
};

export type Breakdown = {
  totalScore: number;
  weights: {
    google: number;
    youtube: number;
  };
  sources: {
    google: number;
    youtube: number;
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
      recentAverageInterest: number;
      currentInterest: number;
      peakInterest: number;
      momentum: number;
      variance: number;
      normalizedValue: number;
    };
    youtube: {
      matchedVideos: number;
      averageEngagementScore: number;
      averageViews: number;
      averageLikes: number;
      averageComments: number;
      topVideoViews: number;
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
