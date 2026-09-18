/**
 * Cache infrastructure: Redis key layout, TTLs, and fail-fast timeouts.
 *
 * Cache operations must never block a response. If Redis is slow or
 * unreachable we fail fast and fall through to the upstream fetch.
 */

export const CACHE_TIMEOUT_MS = 1_000

/** The backup ("stale") copy outlives the fresh entry by this factor. */
export const STALE_TTL_MULTIPLIER = 10

export function cacheKey(chainSlug: string, tokens: string[]): string {
  return `dex:quotes:${chainSlug}:${[...tokens].sort().join(',').toLowerCase()}`
}

/**
 * Backup copy kept well beyond the fresh TTL so an upstream outage can still
 * be served with the last known-good data (the STALE path).
 */
export function staleCacheKey(key: string): string {
  return `${key}:stale`
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ])
}