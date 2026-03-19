type AppConfig = {
  cacheTtlMs: number;
  googleWeight: number;
  redditWeight: number;
  requestTimeoutMs: number;
  retryAttempts: number;
  redditMinScore: number;
  redditWhitelist: string[];
};

function readNumber(
  name: string,
  fallback: number,
  validator: (value: number) => boolean,
): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || !validator(parsed)) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }

  return parsed;
}

function readList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (parsed.length === 0) {
    throw new Error(`Invalid ${name}: expected at least one value`);
  }

  return parsed;
}

const googleWeight = readNumber(
  "MARKET_PULSE_GOOGLE_WEIGHT",
  0.6,
  (value) => value > 0 && value <= 1,
);
const redditWeight = readNumber(
  "MARKET_PULSE_REDDIT_WEIGHT",
  0.4,
  (value) => value > 0 && value <= 1,
);

if (Math.abs(googleWeight + redditWeight - 1) > 0.001) {
  throw new Error(
    "MARKET_PULSE_GOOGLE_WEIGHT and MARKET_PULSE_REDDIT_WEIGHT must sum to 1",
  );
}

export const appConfig: AppConfig = {
  cacheTtlMs: readNumber(
    "MARKET_PULSE_CACHE_TTL_MS",
    10 * 60 * 1000,
    (value) => value >= 1000,
  ),
  googleWeight,
  redditWeight,
  requestTimeoutMs: readNumber(
    "MARKET_PULSE_REQUEST_TIMEOUT_MS",
    5000,
    (value) => value >= 500,
  ),
  retryAttempts: readNumber(
    "MARKET_PULSE_RETRY_ATTEMPTS",
    2,
    (value) => value >= 1 && value <= 5,
  ),
  redditMinScore: readNumber(
    "MARKET_PULSE_REDDIT_MIN_SCORE",
    5,
    (value) => value >= 0,
  ),
  redditWhitelist: readList("MARKET_PULSE_REDDIT_WHITELIST", [
    "startups",
    "entrepreneur",
    "smallbusiness",
    "sideproject",
    "saas",
    "technology",
    "artificial",
    "machinelearning",
    "investing",
    "stocks",
    "marketing",
    "ecommerce",
    "productivity",
    "futurology",
  ]),
};
