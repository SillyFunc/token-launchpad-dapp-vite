import { useMemo, useState } from 'react'
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

export interface TokenGateInput {
  key: string
  address?: string
  backendPresaleAddress?: string | null
}

interface GateEntry {
  address: Address
  backendPresale?: Address
}

/**
 * Batch slot layouts. The batched reader splits the reads into four page-level
 * multicalls: token static (read once), token live (polled), presale static
 * (read once) and presale live (polled). Presale addresses resolve from the
 * live `getTokenPresale` read, with the backend address as a fallback.
 */
const BATCH_TOKEN_STATIC_COUNT = 5
const BATCH_TOKEN_LIVE_COUNT = 6
const BATCH_PRESALE_STATIC_COUNT = 9
const BATCH_PRESALE_LIVE_COUNT = 2

function batchTokenStatic(address: Address): ContractFunctionParameters[] {
  const coordinator = getCoordinatorFactory()

  return [
    call(coordinator.address, coordinator.abi, 'tokenCreators', [address]),
    call(address, flapTaxTokenV3Abi, 'name'),
    call(address, flapTaxTokenV3Abi, 'symbol'),
    call(address, flapTaxTokenV3Abi, 'decimals'),
    call(address, flapTaxTokenV3Abi, 'totalSupply'),
  ]
}

function batchTokenLive(address: Address): ContractFunctionParameters[] {
  const coordinator = getCoordinatorFactory()

  return [
    call(coordinator.address, coordinator.abi, 'tokenExists', [address]),
    call(coordinator.address, coordinator.abi, 'tokenConfigured', [address]),
    call(coordinator.address, coordinator.abi, 'getTokenPresale', [address]),
    call(address, flapTaxTokenV3Abi, 'state'),
    call(address, flapTaxTokenV3Abi, 'getPoolStateData'),
    call(address, flapTaxTokenV3Abi, 'mainPool'),
  ]
}

function batchPresaleStatic(address: Address): ContractFunctionParameters[] {
  return [
    call(address, presaleAbi, 'softCap'),
    call(address, presaleAbi, 'hardcap'),
    call(address, presaleAbi, 'presaleShare'),
    call(address, presaleAbi, 'vestingDelay'),
    call(address, presaleAbi, 'vestingRate'),
    call(address, presaleAbi, 'presaleTokenPrice'),
    call(address, presaleAbi, 'maxBuyPerWallet'),
    call(address, presaleAbi, 'startTime'),
    call(address, presaleAbi, 'endTime'),
  ]
}

function batchPresaleLive(address: Address): ContractFunctionParameters[] {
  return [
    call(address, presaleAbi, 'getLaunchStatus'),
    call(address, presaleAbi, 'lpAddress'),
  ]
}

function hasSlot(data: unknown, index: number): boolean {
  return Array.isArray(data) && index < data.length && data[index] !== undefined
}

function readValue(data: unknown, index: number): unknown {
  if (!Array.isArray(data) || index >= data.length) return undefined
  return (data[index] as ReadResult).result
}

interface BatchTokenStatic {
  creatorAddress?: Address
  tokenName?: string
  tokenSymbol?: string
  tokenDecimals: number
  totalSupply: bigint
}

interface BatchTokenLive {
  tokenExists: boolean
  presaleConfigured: boolean
  chainPresaleAddress?: Address
  tokenState?: number
  buyTaxBps?: number
  sellTaxBps?: number
  mainPool?: Address
}

interface BatchPresaleStatic {
  softCap: bigint
  hardCap: bigint
  presaleShare: bigint
  vestingDelay: bigint
  vestingRate: bigint
  presalePrice: bigint
  maxBuyPerWallet: bigint
  startTime: bigint
  endTime: bigint
}

interface BatchPresaleLive {
  presaleEnabled: boolean
  presaleStatus?: number
  bnbAccumulated: bigint
  tokensSubscribed: bigint
  tokensClaimed: boolean
  lpAddress?: Address
}

function parseBatchTokenStatic(
  data: unknown,
  offset: number,
): BatchTokenStatic {
  return {
    creatorAddress: validAddress(readValue(data, offset) as string | undefined),
    tokenName: readValue(data, offset + 1) as string | undefined,
    tokenSymbol: readValue(data, offset + 2) as string | undefined,
    tokenDecimals: Number(
      (readValue(data, offset + 3) as bigint | undefined) ?? 18,
    ),
    totalSupply: (readValue(data, offset + 4) as bigint | undefined) ?? 0n,
  }
}

function parseBatchTokenLive(data: unknown, offset: number): BatchTokenLive {
  const stateValue = readValue(data, offset + 3)
  const poolState = readValue(data, offset + 4) as
    | { 1?: unknown; 2?: unknown }
    | undefined

  return {
    tokenExists: (readValue(data, offset) as boolean | undefined) ?? false,
    presaleConfigured:
      (readValue(data, offset + 1) as boolean | undefined) ?? false,
    chainPresaleAddress: validAddress(
      readValue(data, offset + 2) as string | undefined,
    ),
    tokenState: stateValue === undefined ? undefined : Number(stateValue),
    buyTaxBps: poolState ? Number(poolState[1]) : undefined,
    sellTaxBps: poolState ? Number(poolState[2]) : undefined,
    mainPool: validAddress(readValue(data, offset + 5) as string | undefined),
  }
}

function parseBatchPresaleStatic(
  data: unknown,
  offset: number,
): BatchPresaleStatic {
  return {
    softCap: (readValue(data, offset) as bigint | undefined) ?? 0n,
    hardCap: (readValue(data, offset + 1) as bigint | undefined) ?? 0n,
    presaleShare: (readValue(data, offset + 2) as bigint | undefined) ?? 0n,
    vestingDelay: (readValue(data, offset + 3) as bigint | undefined) ?? 0n,
    vestingRate: (readValue(data, offset + 4) as bigint | undefined) ?? 0n,
    presalePrice: (readValue(data, offset + 5) as bigint | undefined) ?? 0n,
    maxBuyPerWallet:
      (readValue(data, offset + 6) as bigint | undefined) ?? 0n,
    startTime: (readValue(data, offset + 7) as bigint | undefined) ?? 0n,
    endTime: (readValue(data, offset + 8) as bigint | undefined) ?? 0n,
  }
}

function parseBatchPresaleLive(
  data: unknown,
  offset: number,
): BatchPresaleLive {
  const launchStatus = readValue(data, offset) as readonly unknown[] | undefined

  return {
    presaleEnabled: (launchStatus?.[0] as boolean | undefined) ?? false,
    presaleStatus:
      launchStatus?.[1] === undefined ? undefined : Number(launchStatus[1]),
    bnbAccumulated: (launchStatus?.[2] as bigint | undefined) ?? 0n,
    tokensSubscribed: (launchStatus?.[3] as bigint | undefined) ?? 0n,
    tokensClaimed: (launchStatus?.[5] as boolean | undefined) ?? false,
    lpAddress: validAddress(readValue(data, offset + 1) as string | undefined),
  }
}

function emptyGate(refetch: () => Promise<void>): TokenGateResult {
  return {
    isLoading: false,
    isFetching: false,
    isError: false,
    tokenExists: false,
    presaleConfigured: false,
    tokenDecimals: 18,
    totalSupply: 0n,
    presaleEnabled: false,
    tokensClaimed: false,
    bnbAccumulated: 0n,
    tokensSubscribed: 0n,
    presaleShare: 0n,
    softCap: 0n,
    hardCap: 0n,
    vestingDelay: 0n,
    vestingRate: 0n,
    presalePrice: 0n,
    maxBuyPerWallet: 0n,
    isSoftCapReached: false,
    isSoldOut: false,
    refetch,
  }
}

/**
 * Reads every dashboard card's gate in four page-level multicalls instead of
 * one query per card. Mirrors `useBoardPricing`'s phased batching:
 *
 * - token static / presale static: read once (`staleTime: Infinity`)
 * - token live / presale live: polled every 30s
 *
 * Addresses without a valid value get an empty gate and cost no RPC. Duplicate
 * addresses are deduped, so all keys pointing at the same token share a read.
 */
export function useTokenGates(
  inputs: TokenGateInput[],
): Record<string, TokenGateResult> {
  const entries = useMemo<GateEntry[]>(() => {
    const byAddress = new Map<string, GateEntry>()
    for (const input of inputs) {
      const address = validAddress(input.address)
      if (!address) continue

      const key = address.toLowerCase()
      const entry = byAddress.get(key) ?? { address }
      const backendPresale = validAddress(input.backendPresaleAddress)
      if (!entry.backendPresale && backendPresale) {
        entry.backendPresale = backendPresale
      }
      byAddress.set(key, entry)
    }
    return [...byAddress.values()]
  }, [inputs])

  const indexByAddress = useMemo(
    () =>
      new Map(
        entries.map(
          (entry, index) => [entry.address.toLowerCase(), index] as const,
        ),
      ),
    [entries],
  )

  const tokenStaticContracts = useMemo(
    () => entries.flatMap((entry) => batchTokenStatic(entry.address)),
    [entries],
  )
  const tokenLiveContracts = useMemo(
    () => entries.flatMap((entry) => batchTokenLive(entry.address)),
    [entries],
  )

  const tokenStaticQuery = useReadContracts({
    contracts: tokenStaticContracts,
    query: { enabled: tokenStaticContracts.length > 0, staleTime: Infinity },
  })
  const tokenLiveQuery = useReadContracts({
    contracts: tokenLiveContracts,
    query: {
      enabled: tokenLiveContracts.length > 0,
      staleTime: 10_000,
      refetchInterval: 30_000,
    },
  })

  const tokenStaticByAddress = useMemo(() => {
    const map = new Map<string, BatchTokenStatic>()
    entries.forEach((entry, index) => {
      map.set(
        entry.address.toLowerCase(),
        parseBatchTokenStatic(
          tokenStaticQuery.data,
          index * BATCH_TOKEN_STATIC_COUNT,
        ),
      )
    })
    return map
  }, [entries, tokenStaticQuery.data])

  const tokenLiveByAddress = useMemo(() => {
    const map = new Map<string, BatchTokenLive>()
    entries.forEach((entry, index) => {
      map.set(
        entry.address.toLowerCase(),
        parseBatchTokenLive(
          tokenLiveQuery.data,
          index * BATCH_TOKEN_LIVE_COUNT,
        ),
      )
    })
    return map
  }, [entries, tokenLiveQuery.data])

  const presaleByAddress = useMemo(() => {
    const map = new Map<string, Address>()
    for (const entry of entries) {
      const key = entry.address.toLowerCase()
      const live = tokenLiveByAddress.get(key)
      const presale = live?.chainPresaleAddress ?? entry.backendPresale
      if (presale) map.set(key, presale)
    }
    return map
  }, [entries, tokenLiveByAddress])

  const presaleAddresses = useMemo(() => {
    const seen = new Set<string>()
    const list: Address[] = []
    for (const address of presaleByAddress.values()) {
      const key = address.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      list.push(address)
    }
    return list
  }, [presaleByAddress])

  const presaleIndexByAddress = useMemo(
    () =>
      new Map(
        presaleAddresses.map(
          (address, index) => [address.toLowerCase(), index] as const,
        ),
      ),
    [presaleAddresses],
  )

  const presaleStaticContracts = useMemo(
    () => presaleAddresses.flatMap((address) => batchPresaleStatic(address)),
    [presaleAddresses],
  )
  const presaleLiveContracts = useMemo(
    () => presaleAddresses.flatMap((address) => batchPresaleLive(address)),
    [presaleAddresses],
  )

  const presaleStaticQuery = useReadContracts({
    contracts: presaleStaticContracts,
    query: { enabled: presaleStaticContracts.length > 0, staleTime: Infinity },
  })
  const presaleLiveQuery = useReadContracts({
    contracts: presaleLiveContracts,
    query: {
      enabled: presaleLiveContracts.length > 0,
      staleTime: 10_000,
      refetchInterval: 30_000,
    },
  })

  const presaleStaticByAddress = useMemo(() => {
    const map = new Map<string, BatchPresaleStatic>()
    presaleAddresses.forEach((address, index) => {
      map.set(
        address.toLowerCase(),
        parseBatchPresaleStatic(
          presaleStaticQuery.data,
          index * BATCH_PRESALE_STATIC_COUNT,
        ),
      )
    })
    return map
  }, [presaleAddresses, presaleStaticQuery.data])

  const presaleLiveByAddress = useMemo(() => {
    const map = new Map<string, BatchPresaleLive>()
    presaleAddresses.forEach((address, index) => {
      map.set(
        address.toLowerCase(),
        parseBatchPresaleLive(
          presaleLiveQuery.data,
          index * BATCH_PRESALE_LIVE_COUNT,
        ),
      )
    })
    return map
  }, [presaleAddresses, presaleLiveQuery.data])

  const tokenStaticData = tokenStaticQuery.data
  const tokenLiveData = tokenLiveQuery.data
  const presaleStaticData = presaleStaticQuery.data
  const presaleLiveData = presaleLiveQuery.data
  const tokenStaticFetching = tokenStaticQuery.isFetching
  const tokenLiveFetching = tokenLiveQuery.isFetching
  const presaleStaticFetching = presaleStaticQuery.isFetching
  const presaleLiveFetching = presaleLiveQuery.isFetching
  const tokenStaticError = tokenStaticQuery.isError
  const tokenLiveError = tokenLiveQuery.isError
  const presaleStaticError = presaleStaticQuery.isError
  const presaleLiveError = presaleLiveQuery.isError
  const refetchTokenStatic = tokenStaticQuery.refetch
  const refetchTokenLive = tokenLiveQuery.refetch
  const refetchPresaleStatic = presaleStaticQuery.refetch
  const refetchPresaleLive = presaleLiveQuery.refetch

  return useMemo(() => {
    const refetch = async () => {
      await Promise.all([
        refetchTokenStatic(),
        refetchTokenLive(),
        refetchPresaleStatic(),
        refetchPresaleLive(),
      ])
    }
    const isFetching =
      tokenStaticFetching ||
      tokenLiveFetching ||
      presaleStaticFetching ||
      presaleLiveFetching
    const isError =
      tokenStaticError ||
      tokenLiveError ||
      presaleStaticError ||
      presaleLiveError
    const result: Record<string, TokenGateResult> = {}

    for (const input of inputs) {
      const tokenAddress = validAddress(input.address)

      if (!tokenAddress) {
        result[input.key] = emptyGate(refetch)
        continue
      }

      const key = tokenAddress.toLowerCase()
      const tokenIndex = indexByAddress.get(key)
      const tokenStaticPresent =
        tokenIndex !== undefined &&
        hasSlot(tokenStaticData, tokenIndex * BATCH_TOKEN_STATIC_COUNT)
      const tokenLivePresent =
        tokenIndex !== undefined &&
        hasSlot(tokenLiveData, tokenIndex * BATCH_TOKEN_LIVE_COUNT)

      const staticGate = tokenStaticByAddress.get(key)
      const liveGate = tokenLiveByAddress.get(key)
      const presaleAddress = presaleByAddress.get(key)
      const presaleIndex = presaleAddress
        ? presaleIndexByAddress.get(presaleAddress.toLowerCase())
        : undefined
      const presaleStatic = presaleAddress
        ? presaleStaticByAddress.get(presaleAddress.toLowerCase())
        : undefined
      const presaleLive = presaleAddress
        ? presaleLiveByAddress.get(presaleAddress.toLowerCase())
        : undefined
      const presaleStaticPresent =
        presaleIndex !== undefined &&
        hasSlot(presaleStaticData, presaleIndex * BATCH_PRESALE_STATIC_COUNT)
      const presaleLivePresent =
        presaleIndex !== undefined &&
        hasSlot(presaleLiveData, presaleIndex * BATCH_PRESALE_LIVE_COUNT)
      const presaleReady =
        !presaleAddress || (presaleStaticPresent && presaleLivePresent)

      const softCap = presaleStatic?.softCap ?? 0n
      const bnbAccumulated = presaleLive?.bnbAccumulated ?? 0n
      const presaleShare = presaleStatic?.presaleShare ?? 0n
      const tokensSubscribed = presaleLive?.tokensSubscribed ?? 0n

      result[input.key] = {
        tokenAddress,
        isLoading:
          (!tokenStaticPresent || !tokenLivePresent || !presaleReady) &&
          !isError,
        isFetching,
        isError,
        tokenExists: liveGate?.tokenExists ?? false,
        presaleConfigured: liveGate?.presaleConfigured ?? false,
        presaleAddress,
        creatorAddress: staticGate?.creatorAddress,
        tokenState: liveGate?.tokenState,
        tokenName: staticGate?.tokenName,
        tokenSymbol: staticGate?.tokenSymbol,
        tokenDecimals: staticGate?.tokenDecimals ?? 18,
        totalSupply: staticGate?.totalSupply ?? 0n,
        buyTaxBps: liveGate?.buyTaxBps,
        sellTaxBps: liveGate?.sellTaxBps,
        pairAddress: liveGate?.mainPool ?? presaleLive?.lpAddress,
        presaleEnabled: presaleLive?.presaleEnabled ?? false,
        presaleStatus: presaleLive?.presaleStatus,
        tokensClaimed: presaleLive?.tokensClaimed ?? false,
        bnbAccumulated,
        tokensSubscribed,
        presaleShare,
        softCap,
        hardCap: presaleStatic?.hardCap ?? 0n,
        vestingDelay: presaleStatic?.vestingDelay ?? 0n,
        vestingRate: presaleStatic?.vestingRate ?? 0n,
        presalePrice: presaleStatic?.presalePrice ?? 0n,
        maxBuyPerWallet: presaleStatic?.maxBuyPerWallet ?? 0n,
        startTime:
          presaleStatic && presaleStatic.startTime > 0n
            ? presaleStatic.startTime
            : undefined,
        endTime:
          presaleStatic && presaleStatic.endTime > 0n
            ? presaleStatic.endTime
            : undefined,
        isSoftCapReached: softCap > 0n && bnbAccumulated >= softCap,
        isSoldOut: presaleShare > 0n && tokensSubscribed >= presaleShare,
        refetch,
      }
    }

    return result
  }, [
    inputs,
    indexByAddress,
    tokenStaticByAddress,
    tokenLiveByAddress,
    presaleByAddress,
    presaleIndexByAddress,
    presaleStaticByAddress,
    presaleLiveByAddress,
    tokenStaticData,
    tokenLiveData,
    presaleStaticData,
    presaleLiveData,
    tokenStaticFetching,
    tokenLiveFetching,
    presaleStaticFetching,
    presaleLiveFetching,
    tokenStaticError,
    tokenLiveError,
    presaleStaticError,
    presaleLiveError,
    refetchTokenStatic,
    refetchTokenLive,
    refetchPresaleStatic,
    refetchPresaleLive,
  ])
}
