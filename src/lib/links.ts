import { PLATFORM_DEX_CHAIN_SLUG } from '@/lib/web3'

/** Embedded K-line chart for a liquidity pair. */
export function getPairChartUrl(pairAddress: string): string {
  return `https://www.defined.fi/${PLATFORM_DEX_CHAIN_SLUG}/${encodeURIComponent(pairAddress)}/embed?hideTxTable=1&hideSidebar=1&hideChart=0&hideChartEmptyBars=1&chartSmoothing=0&embedColorMode=DEFAULT&quoteToken=token0`
}

/** PancakeSwap swap page pre-filled with the output token. */
export function getPancakeSwapUrl(tokenAddress: string): string {
  return `https://pancakeswap.finance/swap?outputCurrency=${encodeURIComponent(tokenAddress)}`
}

