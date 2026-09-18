# dex-cache Worker

A thin, CORS-enabled proxy in front of the DEX Screener API, backed by Upstash
Redis. It keeps the SPA from hitting DEX Screener's rate limit and ensures the
Upstash credential never ships to the browser.

```
browser ──► dex-cache Worker ──► Upstash Redis (cache)
                  │
                  └─(cache miss)─► api.dexscreener.com
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness probe: `{ ok, timestamp }` |
| GET | `/quotes?tokens=0x…,0x…` | Aggregated quotes, up to 30 token addresses |

`/quotes` response:

```json
{
  "quotes": {
    "0xaaaa…0001": {
      "tokenAddress": "0xaaaa…0001",
      "pairAddress": "0x1111…0002",
      "dexId": "pancakeswap",
      "priceNative": 0.00000333,
      "priceUsd": 0.001,
      "change24h": 12.34,
      "volume24h": 7777,
      "liquidityUsd": 42000,
      "txns24h": { "buys": 30, "sells": 11 },
      "marketCap": 100000,
      "pairCreatedAt": 1700000000000
    }
  },
  "cache": "HIT",
  "timestamp": 1700000000000
}
```

Responses carry `x-cache: HIT | MISS | STALE`.

## Behaviour

- **Only opened tokens are returned.** A token counts as live only when it has a
  real price (`priceUsd`/`priceNative` > 0) *and* non-zero liquidity. Presale /
  not-yet-launched tokens are filtered out, so a missing key means "no market".
- **One quote per token.** A token can have many pools; the highest-liquidity
  pair wins.
- **Two-tier cache.** The fresh entry lives `CACHE_TTL_SECONDS` (default 60); a
  backup copy lives `CACHE_TTL_SECONDS × 10` and is served with
  `x-cache: STALE` when the upstream is rate-limited (429), errors, or is
  unreachable.
- **Fail-fast Redis.** Cache reads/writes are capped at 1s. If Redis is slow,
  the request still proceeds to the upstream instead of hanging.
- **Upstream timeout** is 8s; a network failure is normalized to an upstream
  error so it degrades to STALE rather than returning 500.

## Configuration

Non-secret vars live in `wrangler.toml`: `DEX_CHAIN_SLUG`, `CACHE_TTL_SECONDS`,
`MAX_TOKENS_PER_REQUEST`.

Secrets are **never** committed:

```bash
# Local development
cp .dev.vars.example .dev.vars   # then fill in your Upstash credentials

# Production
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

`.dev.vars` is gitignored.

## Develop / deploy

```bash
npm install
npm run dev        # http://127.0.0.1:8787
npm run typecheck
npm test           # boots mocks + wrangler, runs both verification suites
npm run deploy     # requires: wrangler login
```

After deploying, point the frontend at the worker URL (e.g.
`VITE_APP_DEX_API_URL=https://dex-cache.<account>.workers.dev`).

## Layout

```
src/index.ts   Hono app: routes, validation, cache orchestration
src/dex.ts     DEX Screener types, live-pair filter, aggregation, upstream fetch
src/cache.ts   Redis key layout, TTLs, fail-fast timeout helper
test/          mock upstream + mock Upstash + verification suites
```

## Tests

`npm test` starts two local mocks (`test/mock-dex.mjs` on :9099,
`test/mock-upstash.mjs` on :9098) plus `wrangler dev` on :8787 with test
bindings, then runs:

- `test/verify.mjs` — aggregation (highest-liquidity pool wins), filtering
  (unlaunched / zero-liquidity tokens excluded), input validation, dedupe.
- `test/verify-cache.mjs` — `MISS → HIT → STALE`, the last one by shutting the
  mock upstream down after the fresh TTL expires.