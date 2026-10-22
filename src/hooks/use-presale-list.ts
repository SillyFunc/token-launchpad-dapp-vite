import { useQuery } from '@tanstack/react-query'
import { useConfig, type Config } from 'wagmi'
import { readContract, readContracts } from 'wagmi/actions'
import {
  zeroAddress,
  type Address,
  type ContractFunctionParameters,
} from 'viem'

import { getCoordinatorFactory, presaleAbi } from '@/contracts'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'

/** `presaleStatus()` while subscriptions are open (docs/frontend-integration.md §4.1). */
const STATUS_SUBSCRIBING = 1n

const PAIR_PAGE_SIZE = 50n
const CALL_BATCH_SIZE = 50

/** Presale reads for each open presale. Results are read back by position. */
const DETAIL_FUNCTIONS = [
  'presaleTokenPrice',
  'accumulatedBNB',
  'softCap',
  'hardcap',
  'startTime',
  'endTime',
  'maxBuyPerWallet',
] as const

export interface PresaleListItem {
  tokenAddress: Address
  presaleAddress: Address
  creator: Address
  name: string
  symbol: string
  /** `upcoming` while the subscription window has not started yet. */
  stage: 'open' | 'upcoming'
  presalePrice: bigint
  raised: bigint
  softCap: bigint
  /** 0 when the presale has no hard cap. */
  hardcap: bigint
  startTime: bigint
  endTime: bigint
  /** Per-wallet subscription cap, in token wei. */
  maxBuyPerWallet: bigint
}

export const presaleListKeys = {
  all: ['presaleList'] as const,
}

interface TokenPresalePair {
  tokenAddress: Address
  presaleAddress: Address
  creator: Address
  tokenName: string
  tokenSymbol: string
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
}

function asBigInt(value: unknown): bigint {
  return typeof value === 'bigint' ? value : 0n
}

/**
 * Runs read calls in batches. A failed call yields `undefined` instead of
 * failing the whole list, so one bad presale address cannot hide the rest.
 */
async function readAll(
  config: Config,
  calls: ContractFunctionParameters[],
  signal: AbortSignal,
): Promise<unknown[]> {
  const values: unknown[] = []
  for (let index = 0; index < calls.length; index += CALL_BATCH_SIZE) {
    const slots = await readContracts(config, {
      allowFailure: true,
      contracts: calls.slice(index, index + CALL_BATCH_SIZE),
    })
    throwIfAborted(signal)
    for (const slot of slots) {
      values.push(slot.status === 'success' ? slot.result : undefined)
    }
  }
  return values
}

async function fetchPresaleList(
  config: Config,
  signal: AbortSignal,
): Promise<PresaleListItem[]> {
  const coordinator = getCoordinatorFactory()
  const count = await readContract(config, {
    ...coordinator,
    chainId: PLATFORM_CHAIN_ID,
    functionName: 'getTotalTokenCount',
  })
  throwIfAborted(signal)

  // Every platform token gets a presale escrow, so the pair list is the
  // full set of candidates.
  const pairs: TokenPresalePair[] = []
  for (let offset = 0n; offset < count; offset += PAIR_PAGE_SIZE) {
    const page = await readContract(config, {
      ...coordinator,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'getAllTokenPresalePairs',
      args: [offset, PAIR_PAGE_SIZE],
    })
    throwIfAborted(signal)
    if (page.length === 0) break
    pairs.push(...page)
  }

  const candidates = pairs.filter(
    (pair) =>
      pair.tokenAddress !== zeroAddress && pair.presaleAddress !== zeroAddress,
  )

  const statuses = await readAll(
    config,
    candidates.map((pair) => ({
      address: pair.presaleAddress,
      abi: presaleAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'presaleStatus',
    })),
    signal,
  )
  const subscribing = candidates.filter(
    (_, index) => asBigInt(statuses[index]) === STATUS_SUBSCRIBING,
  )

  const details = await readAll(
    config,
    subscribing.flatMap((pair) =>
      DETAIL_FUNCTIONS.map((functionName) => ({
        address: pair.presaleAddress,
        abi: presaleAbi,
        chainId: PLATFORM_CHAIN_ID,
        functionName,
      })),
    ),
    signal,
  )

  const now = BigInt(Math.floor(Date.now() / 1000))
  const presales: PresaleListItem[] = []

  subscribing.forEach((pair, index) => {
    const base = index * DETAIL_FUNCTIONS.length
    const startTime = asBigInt(details[base + 4])
    const endTime = asBigInt(details[base + 5])
    // After endTime the status stays 1 until someone calls endPresale(), so
    // windows that already closed are left out.
    if (endTime <= now) return

    presales.push({
      tokenAddress: pair.tokenAddress,
      presaleAddress: pair.presaleAddress,
      creator: pair.creator,
      name: pair.tokenName,
      symbol: pair.tokenSymbol,
      stage: startTime > now ? 'upcoming' : 'open',
      presalePrice: asBigInt(details[base]),
      raised: asBigInt(details[base + 1]),
      softCap: asBigInt(details[base + 2]),
      hardcap: asBigInt(details[base + 3]),
      startTime,
      endTime,
      maxBuyPerWallet: asBigInt(details[base + 6]),
    })
  })

  // Ending soonest first.
  return presales.sort((a, b) => Number(a.endTime - b.endTime))
}

export function usePresaleList() {
  const config = useConfig()

  return useQuery({
    queryKey: presaleListKeys.all,
    queryFn: ({ signal }) => fetchPresaleList(config, signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
