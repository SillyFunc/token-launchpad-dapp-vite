import { bscTestnet } from 'wagmi/chains'

export const PLATFORM_CHAIN = bscTestnet
export const PLATFORM_CHAIN_ID = bscTestnet.id

/**
 * Wrapped native token (WBNB) on the platform chain. DEX aggregators report a
 * pair's `priceNative` relative to its quote token, so a quote is only usable
 * as a BNB price when the pair is quoted against this address.
 * (BSC testnet WBNB — switch back to 0xbb4CdB…95c on mainnet.)
 */
export const WRAPPED_NATIVE_ADDRESS = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'

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
