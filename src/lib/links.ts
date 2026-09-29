import { bscTestnet } from 'wagmi/chains'

import { PLATFORM_CHAIN_ID, getDexChainSlug } from '@/lib/web3'

/**
 * Mainnet token used as a stand-in chart target on networks without a chart
 * provider (e.g. BSC testnet), so the chart still renders something instead of
 * a broken embed.
 */
export const TESTNET_CHART_PLACEHOLDER_ADDRESS =
  '0x223c585c50d4747653a57d577707b1eadbb2cfb0'

/** Embedded K-line chart for a liquidity pair. */
export function getPairChartUrl(pairAddress: string): string {
  const chainSlug = getDexChainSlug()
  const address = chainSlug ? pairAddress : TESTNET_CHART_PLACEHOLDER_ADDRESS
  return `https://www.defined.fi/${chainSlug ?? 'bsc'}/${encodeURIComponent(address)}/embed?hideTxTable=1&hideSidebar=1&hideChart=0&hideChartEmptyBars=1&chartSmoothing=0&embedColorMode=DEFAULT&quoteToken=token0`
}

/** PancakeSwap chain key for the platform chain (testnet vs mainnet). */
function getPancakeChainKey(): string {
  return PLATFORM_CHAIN_ID === bscTestnet.id ? 'bscTestnet' : 'bsc'
}

/** PancakeSwap swap page pre-filled with the output token. */
export function getPancakeSwapUrl(tokenAddress: string): string {
  const params = new URLSearchParams({
    chain: getPancakeChainKey(),
    outputCurrency: tokenAddress,
  })
  return `https://pancakeswap.finance/swap?${params.toString()}`
}
