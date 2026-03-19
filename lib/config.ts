type AppConfig = {
  cacheTtlMs: number;
  requestTimeoutMs: number;
  retryAttempts: number;
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

export const appConfig: AppConfig = {
  cacheTtlMs: readNumber(
    "MARKET_PULSE_CACHE_TTL_MS",
    10 * 60 * 1000,
    (value) => value >= 1000,
  ),
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
};
