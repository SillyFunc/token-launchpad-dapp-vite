import { Redis } from '@upstash/redis/cloudflare'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

import {
  CACHE_TIMEOUT_MS,
  STALE_TTL_MULTIPLIER,
  cacheKey,
  staleCacheKey,
  withTimeout,
} from './cache'
import {
  DEFAULT_DEX_API_BASE,
  DexUpstreamError,
  aggregate,
  fetchFromDex,
  type TokenQuote,
} from './dex'

export interface Env {
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string
  DEX_CHAIN_SLUG: string
  CACHE_TTL_SECONDS: string
  MAX_TOKENS_PER_REQUEST: string
  /** Optional override, mainly for local testing against a mock upstream. */
  DEX_API_BASE?: string
}

interface QuoteResponse {
  quotes: Record<string, TokenQuote>
  cache: 'HIT' | 'MISS' | 'STALE'
  timestamp: number
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

const INVALID_TOKENS_MESSAGE =
  'Provide `tokens` as a comma-separated list of 0x addresses'

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Parses, lowercases and de-duplicates the `tokens` query parameter.
 * The max-count limit is enforced in the handler because it comes from env.
 */
const tokensQuerySchema = z.object({
  tokens: z
    .string({ error: INVALID_TOKENS_MESSAGE })
    .transform((raw) => [
      ...new Set(
        raw
          .split(',')
          .map((token) => token.trim().toLowerCase())
          .filter((token) => ADDRESS_RE.test(token)),
      ),
    ])
    .refine((tokens) => tokens.length > 0, { error: INVALID_TOKENS_MESSAGE }),
})

const app = new Hono<{ Bindings: Env }>()

/**
 * Cache is an optimisation, not a dependency: when the Upstash credentials are
 * missing or malformed we keep serving live prices without caching instead of
 * failing every request. Misconfiguration is reported on /health.
 */
function createRedis(env: Env): Redis | null {
  try {
    return Redis.fromEnv(env)
  } catch (error) {
    console.error('Redis is misconfigured; serving uncached responses', error)
    return null
  }
}

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86_400,
  }),
)

app.get('/health', (c) => {
  const redis = createRedis(c.env)
  return c.json({
    ok: true,
    redisConfigured: redis !== null,
    chainSlug: c.env.DEX_CHAIN_SLUG ?? 'bsc',
    timestamp: Date.now(),
  })
})

app.get(
  '/quotes',
  zValidator('query', tokensQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: result.error.issues[0]?.message ?? INVALID_TOKENS_MESSAGE },
        400,
      )
    }
    return undefined
  }),
  async (c) => {
    const { tokens } = c.req.valid('query')

    const maxTokens = readNumber(c.env.MAX_TOKENS_PER_REQUEST, 30)
    if (tokens.length > maxTokens) {
      return c.json({ error: `Too many tokens (max ${maxTokens})` }, 400)
    }

    const chainSlug = c.env.DEX_CHAIN_SLUG ?? 'bsc'
    const ttl = readNumber(c.env.CACHE_TTL_SECONDS, 60)
    const key = cacheKey(chainSlug, tokens)

    const redis = createRedis(c.env)
    const cacheHeaders = {
      'Cache-Control': `public, max-age=${Math.min(ttl, 30)}`,
    }

    // ---- 1) Fresh cache ----
    if (redis) {
      try {
        const cached = await withTimeout(
          redis.get<QuoteResponse>(key),
          CACHE_TIMEOUT_MS,
          'Redis GET',
        )
        if (cached) {
          return c.json({ ...cached, cache: 'HIT' as const }, 200, {
            ...cacheHeaders,
            'x-cache': 'HIT',
          })
        }
      } catch (err) {
        console.error('Redis GET failed, continuing to upstream', err)
      }
    }

    // ---- 2) Upstream ----
    let quotes: Record<string, TokenQuote>
    try {
      quotes = aggregate(
        await fetchFromDex(
          c.env.DEX_API_BASE ?? DEFAULT_DEX_API_BASE,
          chainSlug,
          tokens,
        ),
      )
    } catch (err) {
      if (err instanceof DexUpstreamError) {
        // Rate-limited or broken upstream: serve the last known-good snapshot.
        if (redis) {
          try {
            const stale = await withTimeout(
              redis.get<QuoteResponse>(staleCacheKey(key)),
              CACHE_TIMEOUT_MS,
              'Redis GET (stale)',
            )
            if (stale) {
              return c.json({ ...stale, cache: 'STALE' as const }, 200, {
                'x-cache': 'STALE',
                'x-upstream-status': String(err.status),
              })
            }
          } catch {
            /* ignore: fall through to the error response */
          }
        }
        return c.json(
          {
            error: 'Upstream price service unavailable',
            upstreamStatus: err.status,
          },
          err.status === 429 ? 503 : 502,
        )
      }
      return c.json({ error: 'Unexpected error fetching prices' }, 500)
    }

    // ---- 3) Refresh cache without blocking the response ----
    const body: QuoteResponse = { quotes, cache: 'MISS', timestamp: Date.now() }
    if (redis) {
      c.executionCtx.waitUntil(
        Promise.all([
          withTimeout(
            redis.set(key, body, { ex: ttl }),
            CACHE_TIMEOUT_MS,
            'Redis SET',
          ),
          withTimeout(
            redis.set(staleCacheKey(key), body, {
              ex: ttl * STALE_TTL_MULTIPLIER,
            }),
            CACHE_TIMEOUT_MS,
            'Redis SET (stale)',
          ),
        ]).catch((err) => {
          console.error('Redis SET failed', err)
        }),
      )
    }

    return c.json(body, 200, { ...cacheHeaders, 'x-cache': 'MISS' })
  },
)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

export default app
