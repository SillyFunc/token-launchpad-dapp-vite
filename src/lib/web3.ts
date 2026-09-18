import { bsc } from 'wagmi/chains'

export const PLATFORM_CHAIN = bsc
export const PLATFORM_CHAIN_ID = bsc.id

/** Default public RPC endpoints, overridable via env. */
export const DEFAULT_RPC_HTTP = 'https://bsc-rpc.publicnode.com'
export const DEFAULT_RPC_WS = 'wss://bsc-rpc.publicnode.com'

/**
 * Wrapped native token (WBNB) on the platform chain. DEX aggregators report a
 * pair's `priceNative` relative to its quote token, so a quote is only usable
 * as a BNB price when the pair is quoted against this address.
 */
export const WRAPPED_NATIVE_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

/**
 * Chain slug used by external DEX aggregators (defined.fi, dexscreener, ...).
 * Derived from the platform chain so it stays in sync when the chain changes.
 */
export const PLATFORM_DEX_CHAIN_SLUG = 'bsc'

export function getExplorerAddressUrl(address?: string | null) {
  if (!address) return undefined
  return `${PLATFORM_CHAIN.blockExplorers.default.url}/address/${encodeURIComponent(address)}`
}

export function getExplorerTransactionUrl(hash?: string | null) {
  if (!hash) return undefined
  return `${PLATFORM_CHAIN.blockExplorers.default.url}/tx/${encodeURIComponent(hash)}`
}
