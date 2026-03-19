export type Trend = "Rising" | "Stable" | "Declining";

export type SignalStrength = "High" | "Medium" | "Low";

export type Momentum = "Accelerating" | "Flat" | "Slowing";

export type PlatformSignal = {
  name: "Google Trends" | "Reddit" | "Momentum";
  score: number;
  summary: string;
  signal: string;
};

export type AnalysisResult = {
  query: string;
  score: number;
  trend: Trend;
  google: SignalStrength;
  reddit: SignalStrength;
  momentum: Momentum;
  related: string[];
  summary: string;
  platforms: PlatformSignal[];
  sources: {
    googleTrends: string;
    reddit: string;
  };
};
