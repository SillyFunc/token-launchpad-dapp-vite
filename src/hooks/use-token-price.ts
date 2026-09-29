import { useReadContracts } from 'wagmi'
import { formatUnits, parseAbi, zeroAddress, type Address } from 'viem'

import { PLATFORM_CHAIN_ID, WRAPPED_NATIVE_ADDRESS } from '@/lib/web3'

// This is the external PancakeSwap V2 pair interface. Launchpad ABIs come from
// @sillyfunc/launchpad-contracts in use-token-gate.ts.
const pairAbi = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
])

function reserveAt(reserves: unknown, index: 0 | 1): bigint | null {
  if (!reserves || typeof reserves !== 'object') return null
  const value = reserves as {
    0?: bigint
    1?: bigint
    reserve0?: bigint
    reserve1?: bigint
  }
  const named = index === 0 ? value.reserve0 : value.reserve1
  const indexed = value[index]
  const reserve = typeof named === 'bigint' ? named : indexed
  return typeof reserve === 'bigint' ? reserve : null
}

function priceFromReserves(
  wbnbReserve: bigint,
  tokenReserve: bigint,
  tokenDecimals: number,
): number | null {
  if (wbnbReserve <= 0n || tokenReserve <= 0n) return null
  const scaled =
    (wbnbReserve * 10n ** BigInt(tokenDecimals)) / tokenReserve
  const price = Number(scaled) / 1e18
  return Number.isFinite(price) && price > 0 ? price : null
}

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
        functionName: 'token1',
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
  const token1 = query.data?.[1]?.result
  const reserves = query.data?.[2]?.result
  const reserve0 = reserveAt(reserves, 0)
  const reserve1 = reserveAt(reserves, 1)
  let livePrice: number | null = null

  if (tokenAddress && token0 && token1 && reserve0 !== null && reserve1 !== null) {
    const token = tokenAddress.toLowerCase()
    const wbnb = WRAPPED_NATIVE_ADDRESS.toLowerCase()
    const side0 = token0.toLowerCase()
    const side1 = token1.toLowerCase()
    const tokenReserve =
      side0 === token ? reserve0 : side1 === token ? reserve1 : null
    const wbnbReserve =
      side0 === wbnb ? reserve0 : side1 === wbnb ? reserve1 : null

    if (tokenReserve !== null && wbnbReserve !== null) {
      livePrice = priceFromReserves(wbnbReserve, tokenReserve, tokenDecimals)
    }
  }

  const baselinePrice =
    presalePrice > 0n ? Number(formatUnits(presalePrice, 18)) : null
  const priceBNB = livePrice ?? baselinePrice
  const supply = Number(formatUnits(totalSupply, tokenDecimals))
  const marketCapBNB =
    livePrice !== null && Number.isFinite(supply) ? livePrice * supply : null
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
