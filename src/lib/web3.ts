import { parseEther } from 'viem'
import { bsc } from 'wagmi/chains'

export const PLATFORM_CHAIN = bsc
export const PLATFORM_CHAIN_ID: number = bsc.id

/**
 * BNB held back for gas when an amount is filled from the whole wallet
 * balance, so the transaction can still pay its fee.
 */
export const NATIVE_GAS_RESERVE = parseEther('0.0005')

/**
 * Wrapped native token (WBNB) on the platform chain. DEX aggregators report a
 * pair's `priceNative` relative to its quote token, so a quote is only usable
 * as a BNB price when the pair is quoted against this address.
 */
export const WRAPPED_NATIVE_ADDRESS =
  PLATFORM_CHAIN_ID === bsc.id
    ? '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
    : '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'

/**
 * Chain slug used by external DEX aggregators (defined.fi, dexscreener, ...).
 * Charts are only published for mainnets, so testnet returns `undefined` and
 * the UI shows an "unavailable" state instead of a broken embed.
 */
const DEX_CHAIN_SLUGS: Partial<Record<number, string>> = {
  [bsc.id]: 'bsc',
}

export function getDexChainSlug(
  chainId: number = PLATFORM_CHAIN_ID,
): string | undefined {
  return DEX_CHAIN_SLUGS[chainId]
}

export function getExplorerAddressUrl(address?: string | null) {
  if (!address) return undefined
  return `${PLATFORM_CHAIN.blockExplorers.default.url}/address/${encodeURIComponent(address)}`
}

export function getExplorerTransactionUrl(hash?: string | null) {
  if (!hash) return undefined
  return `${PLATFORM_CHAIN.blockExplorers.default.url}/tx/${encodeURIComponent(hash)}`
}
