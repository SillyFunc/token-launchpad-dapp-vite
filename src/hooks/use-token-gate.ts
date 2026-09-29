import { useState } from 'react'
import { useReadContracts } from 'wagmi'
import {
  flapTaxTokenV3Abi,
  presaleAbi,
  getCoordinatorFactory,
} from '@/contracts'
import { pairQuoteAbi, type ManagedPairReads } from '@/hooks/use-token-price'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import {
  isAddress,
  zeroAddress,
  type Abi,
  type Address,
  type ContractFunctionParameters,
} from 'viem'

function validAddress(value?: string | null): Address | undefined {
  if (!value || !isAddress(value) || value.toLowerCase() === zeroAddress) {
    return undefined
  }
  return value as Address
}

type ReadResult = { result?: unknown }

export interface UseTokenGateOptions {
  /** Live fields only. Static identity is read once. */
  refetchInterval?: number
  /** Fold pair token0/token1/getReserves into the live multicall. */
  watchPair?: boolean
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
  pairReads?: ManagedPairReads
  refetch: () => Promise<void>
}

const TOKEN_LIVE_COUNT = 6
const PRESALE_LIVE_COUNT = 2

function call(
  address: Address,
  abi: Abi,
  functionName: string,
  args?: readonly unknown[],
): ContractFunctionParameters {
  return {
    address,
    abi,
    functionName,
    args,
    chainId: PLATFORM_CHAIN_ID,
  } as ContractFunctionParameters
}

export function useTokenGate(
  address?: string,
  backendPresaleAddress?: string | null,
  options: UseTokenGateOptions = {},
): TokenGateResult {
  const { refetchInterval = 30_000, watchPair = false } = options
  const coordinator = getCoordinatorFactory()
  const tokenAddress = validAddress(address)
  const queryTokenAddress = tokenAddress ?? zeroAddress
  const backendPresale = validAddress(backendPresaleAddress)
  const tokenKey = tokenAddress ?? ''
  const [trackedKey, setTrackedKey] = useState(tokenKey)
  const [seenPresale, setSeenPresale] = useState<Address>()
  const [seenPair, setSeenPair] = useState<Address>()
  const [keptStatic, setKeptStatic] = useState<readonly ReadResult[]>()
  const [keptLive, setKeptLive] = useState<readonly ReadResult[]>()
  if (trackedKey !== tokenKey) {
    setTrackedKey(tokenKey)
    setSeenPresale(undefined)
    setSeenPair(undefined)
    setKeptStatic(undefined)
    setKeptLive(undefined)
  }

  const presaleAddress = seenPresale ?? backendPresale
  const queryPresaleAddress = presaleAddress ?? zeroAddress
  const pairAddress = watchPair ? seenPair : undefined

  const staticContracts: ContractFunctionParameters[] = [
    call(coordinator.address, coordinator.abi, 'tokenCreators', [
      queryTokenAddress,
    ]),
    call(queryTokenAddress, flapTaxTokenV3Abi, 'name'),
    call(queryTokenAddress, flapTaxTokenV3Abi, 'symbol'),
    call(queryTokenAddress, flapTaxTokenV3Abi, 'decimals'),
    call(queryTokenAddress, flapTaxTokenV3Abi, 'totalSupply'),
  ]
  if (presaleAddress) {
    staticContracts.push(
      call(queryPresaleAddress, presaleAbi, 'softCap'),
      call(queryPresaleAddress, presaleAbi, 'hardcap'),
      call(queryPresaleAddress, presaleAbi, 'presaleShare'),
      call(queryPresaleAddress, presaleAbi, 'vestingDelay'),
      call(queryPresaleAddress, presaleAbi, 'vestingRate'),
      call(queryPresaleAddress, presaleAbi, 'presaleTokenPrice'),
      call(queryPresaleAddress, presaleAbi, 'maxBuyPerWallet'),
      call(queryPresaleAddress, presaleAbi, 'startTime'),
      call(queryPresaleAddress, presaleAbi, 'endTime'),
    )
  }

  const liveContracts: ContractFunctionParameters[] = [
    call(coordinator.address, coordinator.abi, 'tokenExists', [
      queryTokenAddress,
    ]),
    call(coordinator.address, coordinator.abi, 'tokenConfigured', [
      queryTokenAddress,
    ]),
    call(coordinator.address, coordinator.abi, 'getTokenPresale', [
      queryTokenAddress,
    ]),
    call(queryTokenAddress, flapTaxTokenV3Abi, 'state'),
    call(queryTokenAddress, flapTaxTokenV3Abi, 'getPoolStateData'),
    call(queryTokenAddress, flapTaxTokenV3Abi, 'mainPool'),
  ]
  if (presaleAddress) {
    liveContracts.push(
      call(queryPresaleAddress, presaleAbi, 'getLaunchStatus'),
      call(queryPresaleAddress, presaleAbi, 'lpAddress'),
    )
  }
  if (pairAddress) {
    liveContracts.push(
      call(pairAddress, pairQuoteAbi, 'token0'),
      call(pairAddress, pairQuoteAbi, 'token1'),
      call(pairAddress, pairQuoteAbi, 'getReserves'),
    )
  }

  const staticQuery = useReadContracts({
    contracts: staticContracts,
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: Infinity,
    },
  })
  const liveQuery = useReadContracts({
    contracts: liveContracts,
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: 10_000,
      refetchInterval,
    },
  })

  const staticResult = staticQuery.data as readonly ReadResult[] | undefined
  const liveResult = liveQuery.data as readonly ReadResult[] | undefined
  if (staticResult && staticResult !== keptStatic) setKeptStatic(staticResult)
  if (liveResult && liveResult !== keptLive) setKeptLive(liveResult)
  const staticData = staticResult ?? keptStatic
  const liveData = liveResult ?? keptLive

  const freshPresale = validAddress(liveData?.[2]?.result as string | undefined)
  const resolvedPresale = freshPresale ?? backendPresale
  const freshMainPool = validAddress(liveData?.[5]?.result as string | undefined)
  const freshLp = presaleAddress
    ? validAddress(
        liveData?.[TOKEN_LIVE_COUNT + 1]?.result as string | undefined,
      )
    : undefined
  const resolvedPair = freshMainPool ?? freshLp
  if (freshPresale && freshPresale !== seenPresale) setSeenPresale(freshPresale)
  if (watchPair && resolvedPair && resolvedPair !== seenPair) {
    setSeenPair(resolvedPair)
  }

  const poolState = liveData?.[4]?.result as
    | { 1?: bigint | number; 2?: bigint | number }
    | undefined
  const launchStatus = presaleAddress
    ? (liveData?.[TOKEN_LIVE_COUNT]?.result as readonly unknown[] | undefined)
    : undefined
  const pairIndex = TOKEN_LIVE_COUNT + (presaleAddress ? PRESALE_LIVE_COUNT : 0)
  const staticPresaleIndex = 5
  const startTimeValue =
    (staticData?.[staticPresaleIndex + 7]?.result as bigint | undefined) ?? 0n
  const endTimeValue =
    (staticData?.[staticPresaleIndex + 8]?.result as bigint | undefined) ?? 0n
  const bnbAccumulated = (launchStatus?.[2] as bigint | undefined) ?? 0n
  const tokensSubscribed = (launchStatus?.[3] as bigint | undefined) ?? 0n
  const presaleShare =
    (staticData?.[staticPresaleIndex + 2]?.result as bigint | undefined) ?? 0n
  const softCap =
    (staticData?.[staticPresaleIndex]?.result as bigint | undefined) ?? 0n

  return {
    tokenAddress,
    isLoading: Boolean(tokenAddress) && (!staticData || !liveData),
    isFetching: staticQuery.isFetching || liveQuery.isFetching,
    isError: staticQuery.isError || liveQuery.isError,
    tokenExists: (liveData?.[0]?.result as boolean | undefined) ?? false,
    presaleConfigured: (liveData?.[1]?.result as boolean | undefined) ?? false,
    creatorAddress: validAddress(staticData?.[0]?.result as string | undefined),
    presaleAddress: resolvedPresale,
    tokenState:
      liveData?.[3]?.result === undefined
        ? undefined
        : Number(liveData[3].result),
    tokenName: staticData?.[1]?.result as string | undefined,
    tokenSymbol: staticData?.[2]?.result as string | undefined,
    tokenDecimals: Number(staticData?.[3]?.result ?? 18),
    totalSupply: (staticData?.[4]?.result as bigint | undefined) ?? 0n,
    buyTaxBps: poolState ? Number(poolState[1]) : undefined,
    sellTaxBps: poolState ? Number(poolState[2]) : undefined,
    pairAddress: resolvedPair,
    presaleEnabled: (launchStatus?.[0] as boolean | undefined) ?? false,
    presaleStatus:
      launchStatus?.[1] === undefined ? undefined : Number(launchStatus[1]),
    bnbAccumulated,
    tokensSubscribed,
    tokensClaimed: (launchStatus?.[5] as boolean | undefined) ?? false,
    presaleShare,
    softCap,
    hardCap:
      (staticData?.[staticPresaleIndex + 1]?.result as bigint | undefined) ?? 0n,
    vestingDelay:
      (staticData?.[staticPresaleIndex + 3]?.result as bigint | undefined) ?? 0n,
    vestingRate:
      (staticData?.[staticPresaleIndex + 4]?.result as bigint | undefined) ?? 0n,
    presalePrice:
      (staticData?.[staticPresaleIndex + 5]?.result as bigint | undefined) ?? 0n,
    maxBuyPerWallet:
      (staticData?.[staticPresaleIndex + 6]?.result as bigint | undefined) ?? 0n,
    startTime: startTimeValue > 0n ? startTimeValue : undefined,
    endTime: endTimeValue > 0n ? endTimeValue : undefined,
    isSoftCapReached: softCap > 0n && bnbAccumulated >= softCap,
    isSoldOut: presaleShare > 0n && tokensSubscribed >= presaleShare,
    pairReads: watchPair
      ? {
          token0: liveData?.[pairIndex]?.result as Address | undefined,
          token1: liveData?.[pairIndex + 1]?.result as Address | undefined,
          reserves: liveData?.[pairIndex + 2]?.result,
        }
      : undefined,
    refetch: async () => {
      await Promise.all([staticQuery.refetch(), liveQuery.refetch()])
    },
  }
}
