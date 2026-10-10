import { parseAbi } from 'viem'

export const taxProcessorAbi = parseAbi([
  'function totalQuoteSentToMarketing() view returns (uint256)',
  'function totalTaxTokenBurned() view returns (uint256)',
  'function totalDividendTokenSent() view returns (uint256)',
  'function totalQuoteAddedToLiquidity() view returns (uint256)',
  'function totalTokenAddedToLiquidity() view returns (uint256)',
])
