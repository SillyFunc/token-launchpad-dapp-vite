import type { BoardDexPair } from '@/api/board'
import { WRAPPED_NATIVE_ADDRESS } from '@/lib/web3'

/** Market figures for one token, read from its DEX pair. */
export interface BoardPairMarket {
  priceUsd: number | null
  /** BNB price, only when the pair is quoted in WBNB; otherwise null. */
  priceBNB: number | null
  marketCap: number | null
  fdv: number | null
  volume24h: number | null
  liquidityUsd: number | null
  changePercent: number | null
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null
}

/**
 * Maps the `pair` object from the board API to the figures the board shows.
 * Missing fields become null so callers can render "--" instead of a fake zero.
 */
export function readBoardMarket(
  pair: BoardDexPair | null | undefined,
): BoardPairMarket | null {
  if (!pair) return null
  const quoteAddress = pair.quoteToken?.address?.toLowerCase()
  const quotedInWbnb = quoteAddress === WRAPPED_NATIVE_ADDRESS.toLowerCase()
  return {
    priceUsd: toFiniteNumber(pair.priceUsd),
    priceBNB: quotedInWbnb ? toFiniteNumber(pair.priceNative) : null,
    marketCap: toFiniteNumber(pair.marketCap),
    fdv: toFiniteNumber(pair.fdv),
    volume24h: toFiniteNumber(pair.volume?.h24),
    liquidityUsd: toFiniteNumber(pair.liquidity?.usd),
    changePercent: toFiniteNumber(pair.priceChange?.h24),
  }
}
