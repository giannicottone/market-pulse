# MarketPulse

MarketPulse is a lightweight market-signal explorer built with Next.js and TypeScript. It combines search intent from Google Trends with filtered discussion signal from Reddit to produce a fast, explainable interest score for a keyword.

## Features

- Server-side signal collection
- Independent source normalization
- Transparent weighted scoring
- Reddit quality filters and subreddit whitelist
- In-memory caching with in-flight deduplication
- Timeout and retry handling for upstream requests
- Source links for verification

## How Scoring Works

MarketPulse normalizes each source independently to a `0-1` scale before combining them.

- Google Trends combines average interest with momentum:
  `((averageInterest / 100) * 0.7) + (sigmoid(momentum) * 0.3)`
- Reddit uses `log(upvotes + comments + 1)` to compress outsized posts, caps post engagement at the 95th percentile, averages engagement per query, then applies:
  `sigmoid(averageEngagement / 5)`
- Reddit is then confidence-weighted using sample size:
  `min(1, matchedPosts / 5)`

The final score uses a transparent weighted model:

```text
score = (0.6 * google_trends) + (0.4 * reddit)
```

The API returns:

- `score`: final score on a `0-100` scale
- `trend`: `rising`, `stable`, or `declining`
- `breakdown.totalScore`: weighted score on a `0-100` scale before rounding to `score`
- `breakdown.sources`: per-source contribution values on a `0-100` scale
- `diagnostics`: raw supporting metrics used to explain the result
- `confidence`: overall confidence from Reddit sample size and Trends variance

Scores are relative per-query and not comparable across keywords.

## Reddit Reliability Rules

Reddit results are filtered before scoring:

- posts below the minimum score threshold are removed
- only whitelisted subreddits are counted
- engagement is based on `log(upvotes + comments + 1)`, not raw totals
- per-post engagement is capped at the 95th percentile before averaging
- low sample sizes reduce Reddit influence in the final score

This keeps broad or noisy queries from overstating Reddit demand.

## Caching

MarketPulse caches results in memory for 10 minutes and also deduplicates in-flight requests for the same keyword so repeated searches do not trigger duplicate upstream calls.

## Environment

Copy `.env.example` to `.env.local` and adjust values if needed.

Key settings:

- `MARKET_PULSE_GOOGLE_WEIGHT`
- `MARKET_PULSE_REDDIT_WEIGHT`
- `MARKET_PULSE_CACHE_TTL_MS`
- `MARKET_PULSE_REQUEST_TIMEOUT_MS`
- `MARKET_PULSE_RETRY_ATTEMPTS`
- `MARKET_PULSE_REDDIT_MIN_SCORE`
- `MARKET_PULSE_REDDIT_WHITELIST`

## Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Project Structure

- `app/api/analyze/route.ts`: thin API route with validation, cache lookup, and response handling
- `lib/config.ts`: environment parsing and validation
- `lib/services/trendsService.ts`: Google Trends fetching and normalization
- `lib/services/redditService.ts`: Reddit fetching, filtering, and normalization
- `lib/services/scoringService.ts`: weighted scoring and response construction
- `lib/services/cacheService.ts`: in-memory result cache and in-flight dedupe

## Notes

- No authentication or database is required.
- No paid APIs are used.
- Signals are directional and intended for fast market validation, not for financial advice.
