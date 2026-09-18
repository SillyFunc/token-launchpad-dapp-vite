import { useQuery } from '@tanstack/react-query'

import {
  fetchDexQuotes,
  isDexConfigured,
  type DexQuotesResponse,
} from '@/api/dex'

export const dexKeys = {
  all: ['dex'] as const,
  quotes: (tokenList: string) => [...dexKeys.all, 'quotes', tokenList] as const,
}

/** Matches the worker's fresh-cache TTL (CACHE_TTL_SECONDS). */
export const DEX_QUOTE_STALE_TIME = 60_000

/** Poll at the same cadence as the cache TTL; skipped while the tab is hidden. */
export const DEX_QUOTE_REFETCH_INTERVAL = 60_000

/**
 * Aggregated market quotes for a set of token addresses, served by the
 * `dex-cache` worker. Returns an empty map when the worker is not configured,
 * so callers can fall back to on-chain pricing.
 */
export function useDexQuotes(tokens: string[]) {
  const tokenList = [
    ...new Set(tokens.map((token) => token.toLowerCase())),
  ]
    .sort()
    .join(',')

  return useQuery<DexQuotesResponse>({
    queryKey: dexKeys.quotes(tokenList),
    queryFn: ({ signal }) => fetchDexQuotes(tokenList.split(','), signal),
    enabled: isDexConfigured() && tokenList.length > 0,
    staleTime: DEX_QUOTE_STALE_TIME,
    gcTime: 5 * 60_000,
    refetchInterval: DEX_QUOTE_REFETCH_INTERVAL,
    // A single retry: the worker already retries upstream and degrades to STALE.
    retry: 1,
  })
}
