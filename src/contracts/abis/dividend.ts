import { parseAbi } from 'viem'

export const dividendAbi = parseAbi([
  'function dividendToken() view returns (address)',
  'function withdrawDividends() returns (bool)',
  'function withdrawableDividendOf(address user) view returns (uint256)',
])
