import { bsc, bscTestnet } from 'wagmi/chains'

import { PLATFORM_CHAIN_ID } from '@/lib/web3'

const chainSlugById: Record<number, string> = {
  [bsc.id]: 'bsc',
  [bscTestnet.id]: 'bsc-testnet',
}

const DEFINED_CHAIN_SLUG: Record<number, string> = {
  [bsc.id]: 'bsc',
  [bscTestnet.id]: 'bsc-testnet',
}

function getChainSlug(chainId: number = PLATFORM_CHAIN_ID): string {
  return chainSlugById[chainId] ?? 'bsc'
}

/** Embedded K-line chart for a liquidity pair. */
export function getPairChartUrl(pairAddress: string): string {
  const slug = DEFINED_CHAIN_SLUG[PLATFORM_CHAIN_ID] ?? 'bsc'
  return `https://www.defined.fi/${slug}/${encodeURIComponent(pairAddress)}/embed?hideTxTable=1&hideSidebar=1&hideChart=0&hideChartEmptyBars=1&chartSmoothing=0&embedColorMode=DEFAULT&quoteToken=token0`
}

/** PancakeSwap swap page pre-filled with the output token. */
export function getPancakeSwapUrl(tokenAddress: string): string {
  return `https://pancakeswap.finance/swap?outputCurrency=${encodeURIComponent(tokenAddress)}`
}

export { getChainSlug }
