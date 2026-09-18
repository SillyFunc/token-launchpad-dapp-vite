import { env } from '@/env/client'

/**
 * Client for the `dex-cache` Cloudflare Worker (see workers/dex-cache/README.md).
 *
 * This is NOT the platform backend: the worker returns a bare JSON payload
 * (no `{ code, message, data }` envelope), so it does not go through
 * `@/lib/http/client`. Failures are deliberately raised as `DexApiError`
 * (not `ApiError`) so the global React Query error handler stays quiet and
 * callers can silently fall back to on-chain pricing.
 */

/** DEX Screener's batch limit, mirrored by the worker. */
export const DEX_MAX_TOKENS_PER_REQUEST = 30

export interface DexTokenQuote {
  tokenAddress: string
  pairAddress: string
  dexId: string
  /**
   * Price in the pair's quote token. Only safe to read as a BNB price when
   * `quoteTokenSymbol` is the wrapped native token (WBNB).
   */
  priceNative: number | null
  priceUsd: number | null
  quoteTokenAddress: string
  quoteTokenSymbol: string
  /** Real 24h price change, as reported by the aggregator. */
  change24h: number | null
  volume24h: number | null
  liquidityUsd: number | null
  txns24h: { buys: number; sells: number } | null
  marketCap: number | null
  pairCreatedAt: number | null
}

export type DexCacheStatus = 'HIT' | 'MISS' | 'STALE'

export interface DexQuotesResponse {
  quotes: Record<string, DexTokenQuote>
  cache: DexCacheStatus
  timestamp: number
}

export class DexApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'DexApiError'
    this.status = status
  }
}

export function isDexConfigured(): boolean {
  return Boolean(env.VITE_APP_DEX_API_URL)
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function requestChunk(
  baseUrl: string,
  tokens: string[],
  signal?: AbortSignal,
): Promise<DexQuotesResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/quotes?tokens=${tokens.join(',')}`

  let response: Response
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new DexApiError('DEX price service is unreachable')
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new DexApiError(
      `DEX price service returned ${response.status}${detail ? `: ${detail}` : ''}`,
      response.status,
    )
  }

  return (await response.json()) as DexQuotesResponse
}

/**
 * Fetches aggregated quotes for the given token addresses.
 * Addresses are lowercased and de-duplicated; batches larger than
 * `DEX_MAX_TOKENS_PER_REQUEST` are split and merged.
 */
export async function fetchDexQuotes(
  tokens: string[],
  signal?: AbortSignal,
): Promise<DexQuotesResponse> {
  const baseUrl = env.VITE_APP_DEX_API_URL
  if (!baseUrl) throw new DexApiError('VITE_APP_DEX_API_URL is not configured')

  const unique = [...new Set(tokens.map((token) => token.toLowerCase()))]
  if (unique.length === 0) {
    return { quotes: {}, cache: 'MISS', timestamp: Date.now() }
  }

  const responses = await Promise.all(
    chunk(unique, DEX_MAX_TOKENS_PER_REQUEST).map((batch) =>
      requestChunk(baseUrl, batch, signal),
    ),
  )

  return {
    quotes: Object.assign({}, ...responses.map((r) => r.quotes)),
    // Worst status wins, so the UI can tell fresh data from degraded data.
    cache: responses.some((r) => r.cache === 'STALE')
      ? 'STALE'
      : responses.every((r) => r.cache === 'HIT')
        ? 'HIT'
        : 'MISS',
    timestamp: Math.max(...responses.map((r) => r.timestamp)),
  }
}