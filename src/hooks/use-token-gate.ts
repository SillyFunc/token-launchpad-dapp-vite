import { useReadContracts } from 'wagmi'
import {
  flapTaxTokenV3Abi,
  presaleAbi,
} from '@sillyfunc/launchpad-contracts'
import { isAddress, zeroAddress, type Address } from 'viem'
import { getCoordinatorFactory } from '@/lib/contracts'

function validAddress(value?: string | null): Address | undefined {
  if (!value || !isAddress(value) || value.toLowerCase() === zeroAddress) {
    return undefined
  }
  return value as Address
}

export interface TokenGateResult {
  tokenAddress?: Address
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  tokenExists: boolean
  presaleConfigured: boolean
  presaleAddress?: Address
  creatorAddress?: Address
  tokenState?: number
  tokenName?: string
  tokenSymbol?: string
  tokenDecimals: number
  totalSupply: bigint
  buyTaxBps?: number
  sellTaxBps?: number
  pairAddress?: Address
  presaleEnabled: boolean
  presaleStatus?: number
  tokensClaimed: boolean
  bnbAccumulated: bigint
  tokensSubscribed: bigint
  presaleShare: bigint
  softCap: bigint
  hardCap: bigint
  vestingDelay: bigint
  vestingRate: bigint
  presalePrice: bigint
  maxBuyPerWallet: bigint
  startTime?: bigint
  endTime?: bigint
  isSoftCapReached: boolean
  isSoldOut: boolean
  refetch: () => Promise<void>
}

export function useTokenGate(
  address?: string,
  backendPresaleAddress?: string | null,
): TokenGateResult {
  const coordinator = getCoordinatorFactory()
  const tokenAddress = validAddress(address)
  const queryTokenAddress = tokenAddress ?? zeroAddress

  const baseQuery = useReadContracts({
    contracts: [
      {
        ...coordinator,
        functionName: 'tokenExists',
        args: [queryTokenAddress],
      },
      {
        ...coordinator,
        functionName: 'tokenConfigured',
        args: [queryTokenAddress],
      },
      {
        ...coordinator,
        functionName: 'tokenCreators',
        args: [queryTokenAddress],
      },
      {
        ...coordinator,
        functionName: 'getTokenPresale',
        args: [queryTokenAddress],
      },
      {
        address: queryTokenAddress,
        abi: flapTaxTokenV3Abi,
        functionName: 'state',
      },
      {
        address: queryTokenAddress,
        abi: flapTaxTokenV3Abi,
        functionName: 'name',
      },
      {
        address: queryTokenAddress,
        abi: flapTaxTokenV3Abi,
        functionName: 'symbol',
      },
      {
        address: queryTokenAddress,
        abi: flapTaxTokenV3Abi,
        functionName: 'decimals',
      },
      {
        address: queryTokenAddress,
        abi: flapTaxTokenV3Abi,
        functionName: 'totalSupply',
      },
      {
        address: queryTokenAddress,
        abi: flapTaxTokenV3Abi,
        functionName: 'getPoolStateData',
      },
      {
        address: queryTokenAddress,
        abi: flapTaxTokenV3Abi,
        functionName: 'mainPool',
      },
    ] as const,
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  })

  const chainPresaleAddress = validAddress(
    baseQuery.data?.[3]?.result as string | undefined,
  )
  const presaleAddress =
    chainPresaleAddress ?? validAddress(backendPresaleAddress)
  const queryPresaleAddress = presaleAddress ?? zeroAddress

  const presaleQuery = useReadContracts({
    contracts: [
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'getLaunchStatus',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'softCap',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'hardcap',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'presaleShare',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'vestingDelay',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'vestingRate',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'presaleTokenPrice',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'maxBuyPerWallet',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'startTime',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'endTime',
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'lpAddress',
      },
    ] as const,
    query: {
      enabled: Boolean(presaleAddress),
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  })

  const launchStatus = presaleQuery.data?.[0]?.result
  const poolState = baseQuery.data?.[9]?.result
  const startTimeValue = presaleQuery.data?.[8]?.result ?? 0n
  const endTimeValue = presaleQuery.data?.[9]?.result ?? 0n
  const mainPool = validAddress(baseQuery.data?.[10]?.result)
  const presalePool = validAddress(presaleQuery.data?.[10]?.result)
  const bnbAccumulated = launchStatus?.[2] ?? 0n
  const tokensSubscribed = launchStatus?.[3] ?? 0n
  const presaleShare = presaleQuery.data?.[3]?.result ?? 0n
  const softCap = presaleQuery.data?.[1]?.result ?? 0n
  const hardCap = presaleQuery.data?.[2]?.result ?? 0n

  return {
    tokenAddress,
    isLoading:
      baseQuery.isLoading || (Boolean(presaleAddress) && presaleQuery.isLoading),
    isFetching: baseQuery.isFetching || presaleQuery.isFetching,
    isError: baseQuery.isError || presaleQuery.isError,
    tokenExists: baseQuery.data?.[0]?.result ?? false,
    presaleConfigured: baseQuery.data?.[1]?.result ?? false,
    creatorAddress: validAddress(baseQuery.data?.[2]?.result),
    presaleAddress,
    tokenState:
      baseQuery.data?.[4]?.result === undefined
        ? undefined
        : Number(baseQuery.data[4].result),
    tokenName: baseQuery.data?.[5]?.result,
    tokenSymbol: baseQuery.data?.[6]?.result,
    tokenDecimals: Number(baseQuery.data?.[7]?.result ?? 18),
    totalSupply: baseQuery.data?.[8]?.result ?? 0n,
    buyTaxBps: poolState ? Number(poolState[1]) : undefined,
    sellTaxBps: poolState ? Number(poolState[2]) : undefined,
    pairAddress: mainPool ?? presalePool,
    presaleEnabled: launchStatus?.[0] ?? false,
    presaleStatus:
      launchStatus?.[1] === undefined ? undefined : Number(launchStatus[1]),
    bnbAccumulated,
    tokensSubscribed,
    tokensClaimed: launchStatus?.[5] ?? false,
    presaleShare,
    softCap,
    hardCap,
    vestingDelay: presaleQuery.data?.[4]?.result ?? 0n,
    vestingRate: presaleQuery.data?.[5]?.result ?? 0n,
    presalePrice: presaleQuery.data?.[6]?.result ?? 0n,
    maxBuyPerWallet: presaleQuery.data?.[7]?.result ?? 0n,
    startTime: startTimeValue > 0n ? startTimeValue : undefined,
    endTime: endTimeValue > 0n ? endTimeValue : undefined,
    isSoftCapReached: softCap > 0n && bnbAccumulated >= softCap,
    isSoldOut: presaleShare > 0n && tokensSubscribed >= presaleShare,
    refetch: async () => {
      await Promise.all([baseQuery.refetch(), presaleQuery.refetch()])
    },
  }
}
