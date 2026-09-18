/**
 * DEX Screener domain logic: raw upstream types, filtering, and aggregation.
 * Framework-agnostic on purpose so it can be unit-tested in isolation.
 */

/** Raw pair object from DEX Screener (only fields we use). */
export interface DexPairRaw {
  chainId: string
  dexId: string
  pairAddress: string
  baseToken: { address: string; name: string; symbol: string }
  quoteToken?: { address: string; name: string; symbol: string }
  priceNative?: string
  priceUsd?: string
  priceChange?: { h24?: number }
  liquidity?: { usd?: number }
  volume?: { h24?: number }
  txns?: { h24?: { buys?: number; sells?: number } }
  marketCap?: number
  fdv?: number
  pairCreatedAt?: number
}

/** Aggregated, normalized quote returned to the frontend (one per token). */
export interface TokenQuote {
  tokenAddress: string
  pairAddress: string
  dexId: string
  /**
   * Price expressed in the pair's quote token. Only meaningful as a BNB price
   * when `quoteTokenSymbol` is the wrapped native token (WBNB) — always check it.
   */
  priceNative: number | null
  priceUsd: number | null
  quoteTokenAddress: string
  quoteTokenSymbol: string
  change24h: number | null
  volume24h: number | null
  liquidityUsd: number | null
  txns24h: { buys: number; sells: number } | null
  marketCap: number | null
  pairCreatedAt: number | null
}

export const DEFAULT_DEX_API_BASE = 'https://api.dexscreener.com'

export const UPSTREAM_TIMEOUT_MS = 8_000

export class DexUpstreamError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'DexUpstreamError'
  }
}

/**
 * A token counts as "opened / live" only when it has a real price and
 * non-trivial liquidity. Presale or not-yet-launched tokens have neither.
 */
function isLivePair(pair: DexPairRaw): boolean {
  const priceUsd = Number(pair.priceUsd ?? pair.priceNative ?? 0)
  const liquidity = pair.liquidity?.usd ?? 0
  return Number.isFinite(priceUsd) && priceUsd > 0 && liquidity > 0
}

/** Pick the highest-liquidity pair per token (a token may have many pools). */
export function aggregate(pairs: DexPairRaw[]): Record<string, TokenQuote> {
  const best = new Map<string, DexPairRaw>()

  for (const pair of pairs) {
    if (!pair?.baseToken?.address) continue
    if (!isLivePair(pair)) continue

    const key = pair.baseToken.address.toLowerCase()
    const existing = best.get(key)
    if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
      best.set(key, pair)
    }
  }

  const quotes: Record<string, TokenQuote> = {}
  for (const [key, p] of best) {
    const priceUsd = Number(p.priceUsd ?? NaN)
    const priceNative = Number(p.priceNative ?? NaN)
    quotes[key] = {
      tokenAddress: p.baseToken.address,
      pairAddress: p.pairAddress,
      dexId: p.dexId,
      priceNative: Number.isFinite(priceNative) ? priceNative : null,
      priceUsd: Number.isFinite(priceUsd) ? priceUsd : null,
      quoteTokenAddress: p.quoteToken?.address ?? '',
      quoteTokenSymbol: p.quoteToken?.symbol ?? '',
      change24h: p.priceChange?.h24 ?? null,
      volume24h: p.volume?.h24 ?? null,
      liquidityUsd: p.liquidity?.usd ?? null,
      txns24h:
        p.txns?.h24 != null
          ? { buys: p.txns.h24.buys ?? 0, sells: p.txns.h24.sells ?? 0 }
          : null,
      marketCap: p.marketCap ?? p.fdv ?? null,
      pairCreatedAt: p.pairCreatedAt ?? null,
    }
  }
  return quotes
}

export async function fetchFromDex(
  apiBase: string,
  chainSlug: string,
  tokens: string[],
): Promise<DexPairRaw[]> {
  const url = `${apiBase}/tokens/v1/${chainSlug}/${tokens.join(',')}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'token-launchpad-dex-cache',
      },
      signal: controller.signal,
    })
  } catch (err) {
    // Network failure or timeout: report it as an upstream error (status 0) so
    // the caller can degrade to the last known-good snapshot instead of 500ing.
    throw new DexUpstreamError(
      0,
      `DEX Screener request failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new DexUpstreamError(res.status, `DEX Screener responded ${res.status}`)
  }
  return (await res.json()) as DexPairRaw[]
}
