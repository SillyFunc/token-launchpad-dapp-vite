import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import {
  isAddress,
  zeroAddress,
  type Address,
  type ContractFunctionParameters,
} from 'viem'

import { buybackVaultAbi, getCoordinatorFactory } from '@/contracts'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'

export interface BuybackVaultStats {
  vaultAddress: Address
  /** `BuybackMode`: 0 = buy and burn the token, 1 = buy and burn LP. */
  mode: number
  /** Tokens bought back and burned. Stays 0 for the LP mode. */
  totalBurnedToken: bigint
  /** LP tokens bought back and burned. Stays 0 for the token mode. */
  totalLpBurned: bigint
  totalBuybackBNB: bigint
  buybackCount: bigint
  treasuryBNB: bigint
}

interface Slot {
  status?: string
  result?: unknown
}

/**
 * Positional fallback for the `VaultStats` members the card renders, mirroring
 * the component order declared in `buybackVaultAbi`.
 */
const STATS_INDEX = {
  treasuryBNB: 0,
  mode: 3,
  totalBuybackBNB: 10,
  totalBurnedToken: 11,
  totalLpBurned: 12,
  buybackCount: 13,
} as const

type StatsField = keyof typeof STATS_INDEX

/**
 * `getVaultStats()` has a single named tuple output, which viem decodes into an
 * object keyed by component name: `stats.totalBurnedToken` works while
 * `stats[11]` is undefined. Index access is kept as a fallback in case a viem
 * version hands back an array again.
 */
function readField(raw: unknown, name: StatsField): unknown {
  if (Array.isArray(raw)) return (raw as readonly unknown[])[STATS_INDEX[name]]
  if (!raw || typeof raw !== 'object') return undefined
  return (raw as Record<string, unknown>)[name]
}

function slot(data: unknown, index: number): Slot | undefined {
  if (!Array.isArray(data) || index >= data.length) return undefined
  return data[index] as Slot
}

function readAddress(value: unknown): Address | undefined {
  if (typeof value !== 'string' || !isAddress(value, { strict: false })) {
    return undefined
  }
  if (value.toLowerCase() === zeroAddress) return undefined
  return value
}

function readBigInt(value: unknown): bigint | undefined {
  return typeof value === 'bigint' ? value : undefined
}

function readStats(
  vaultAddress: Address,
  raw: unknown,
): BuybackVaultStats | undefined {
  const amounts = {
    treasuryBNB: readBigInt(readField(raw, 'treasuryBNB')),
    totalBuybackBNB: readBigInt(readField(raw, 'totalBuybackBNB')),
    totalBurnedToken: readBigInt(readField(raw, 'totalBurnedToken')),
    totalLpBurned: readBigInt(readField(raw, 'totalLpBurned')),
    buybackCount: readBigInt(readField(raw, 'buybackCount')),
  }
  if (Object.values(amounts).some((amount) => amount === undefined)) {
    return undefined
  }

  return {
    vaultAddress,
    mode: Number(readField(raw, 'mode') ?? 0),
    ...(amounts as Record<keyof typeof amounts, bigint>),
  }
}

/**
 * Reads the optional buyback vault attached to each token, in two page-level
 * multicalls:
 *
 * - the vault address (`coordinator.tokenVaults`), read once: a vault is
 *   attached at creation and can never change afterwards;
 * - the vault totals (`getVaultStats`), polled once a minute — well above the
 *   keeper's pace, since it executes intermittently (roughly every 8-10
 *   minutes).
 *
 * Tokens without a vault cost no second-phase read. A vault whose stats have
 * not settled stays `null`, so the card can tell "not loaded" apart from a real
 * zero.
 */
export function useBuybackVaultStats(tokenAddresses: Address[]) {
  const coordinator = useMemo(() => getCoordinatorFactory(), [])

  const addresses = useMemo(() => {
    const seen = new Set<string>()
    return tokenAddresses.filter((address) => {
      const key = address.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [tokenAddresses])

  const vaultContracts = useMemo<ContractFunctionParameters[]>(
    () =>
      addresses.map(
        (address) =>
          ({
            ...coordinator,
            functionName: 'tokenVaults',
            args: [address],
          }) as ContractFunctionParameters,
      ),
    [addresses, coordinator],
  )

  const vaultQuery = useReadContracts({
    contracts: vaultContracts,
    query: {
      enabled: vaultContracts.length > 0,
      staleTime: Infinity,
    },
  })

  const vaults = useMemo(
    () =>
      addresses.flatMap((address, index) => {
        const vault = readAddress(slot(vaultQuery.data, index)?.result)
        return vault ? [{ token: address, vault }] : []
      }),
    [addresses, vaultQuery.data],
  )

  const statsContracts = useMemo<ContractFunctionParameters[]>(
    () =>
      vaults.map(
        (item) =>
          ({
            address: item.vault,
            abi: buybackVaultAbi,
            functionName: 'getVaultStats',
            chainId: PLATFORM_CHAIN_ID,
          }) as ContractFunctionParameters,
      ),
    [vaults],
  )

  const statsQuery = useReadContracts({
    contracts: statsContracts,
    query: {
      enabled: statsContracts.length > 0,
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  })

  const byAddress = useMemo(() => {
    const map: Record<string, BuybackVaultStats | null> = {}
    if (!vaultQuery.data) return map

    for (const address of addresses) {
      map[address.toLowerCase()] = null
    }

    vaults.forEach((item, index) => {
      const statsSlot = slot(statsQuery.data, index)
      const stats =
        statsSlot?.status === 'success'
          ? readStats(item.vault, statsSlot.result)
          : undefined
      if (!stats) return

      map[item.token.toLowerCase()] = stats
    })

    return map
  }, [addresses, statsQuery.data, vaultQuery.data, vaults])

  const isLoading =
    (vaultContracts.length > 0 && vaultQuery.isLoading) ||
    (statsContracts.length > 0 && statsQuery.isLoading)

  return { byAddress, isLoading }
}
