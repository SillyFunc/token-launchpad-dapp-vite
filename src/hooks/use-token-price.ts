import { useReadContracts } from 'wagmi'
import { formatUnits, parseAbi, zeroAddress, type Address } from 'viem'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'

// This is the external PancakeSwap V2 pair interface. Launchpad ABIs come from
// @sillyfunc/launchpad-contracts in use-token-gate.ts.
const pairAbi = parseAbi([
  'function token0() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
])

interface UseTokenPriceOptions {
  tokenAddress?: Address
  pairAddress?: Address
  presalePrice: bigint
  totalSupply: bigint
  tokenDecimals: number
}

export function useTokenPrice({
  tokenAddress,
  pairAddress,
  presalePrice,
  totalSupply,
  tokenDecimals,
}: UseTokenPriceOptions) {
  const queryPairAddress = pairAddress ?? zeroAddress
  const query = useReadContracts({
    contracts: [
      {
        address: queryPairAddress,
        abi: pairAbi,
        functionName: 'token0',
        chainId: PLATFORM_CHAIN_ID,
      },
      {
        address: queryPairAddress,
        abi: pairAbi,
        functionName: 'getReserves',
        chainId: PLATFORM_CHAIN_ID,
      },
    ] as const,
    query: {
      enabled: Boolean(tokenAddress && pairAddress),
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  })

  const token0 = query.data?.[0]?.result
  const reserves = query.data?.[1]?.result
  let livePrice: number | null = null

  if (tokenAddress && token0 && reserves) {
    const tokenIsToken0 = token0.toLowerCase() === tokenAddress.toLowerCase()
    const tokenReserve = tokenIsToken0 ? reserves[0] : reserves[1]
    const bnbReserve = tokenIsToken0 ? reserves[1] : reserves[0]
    const tokenAmount = Number(formatUnits(tokenReserve, tokenDecimals))
    const bnbAmount = Number(formatUnits(bnbReserve, 18))

    if (tokenAmount > 0 && Number.isFinite(tokenAmount)) {
      livePrice = bnbAmount / tokenAmount
    }
  }

  const baselinePrice =
    presalePrice > 0n ? Number(formatUnits(presalePrice, 18)) : null
  const priceBNB = livePrice ?? baselinePrice
  const supply = Number(formatUnits(totalSupply, tokenDecimals))
  const marketCapBNB =
    priceBNB !== null && Number.isFinite(supply) ? priceBNB * supply : null
  const changePercent =
    livePrice !== null && baselinePrice !== null && baselinePrice > 0
      ? ((livePrice - baselinePrice) / baselinePrice) * 100
      : null

  return {
    priceBNB,
    marketCapBNB,
    changePercent,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
