import { bsc } from 'wagmi/chains'

export const PLATFORM_CHAIN = bsc
export const PLATFORM_CHAIN_ID = bsc.id

export function getExplorerAddressUrl(address?: string | null) {
  if (!address) return undefined
  return `${PLATFORM_CHAIN.blockExplorers.default.url}/address/${encodeURIComponent(address)}`
}

export function getExplorerTransactionUrl(hash?: string | null) {
  if (!hash) return undefined
  return `${PLATFORM_CHAIN.blockExplorers.default.url}/tx/${encodeURIComponent(hash)}`
}
