import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import {
  isAddress,
  zeroAddress,
  type Address,
  type ContractFunctionParameters,
} from 'viem'

import { flapTaxTokenV3Abi, taxProcessorAbi } from '@/contracts'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'

export interface TaxChannelYield {
  marketingBNB: bigint
  burnedTokens: bigint
  dividendBNB: bigint
  liquidityBNB: bigint
  liquidityTokens: bigint
}

const COUNTERS = [
  'totalQuoteSentToMarketing',
  'totalTaxTokenBurned',
  'totalDividendTokenSent',
  'totalQuoteAddedToLiquidity',
  'totalTokenAddedToLiquidity',
] as const

interface Slot {
  status?: string
  result?: unknown
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

function readAmount(value: unknown): bigint | undefined {
  return typeof value === 'bigint' ? value : undefined
}

export function useTaxChannelYields(tokenAddresses: Address[]) {
  const addresses = useMemo(() => {
    const seen = new Set<string>()
    return tokenAddresses.filter((address) => {
      const key = address.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [tokenAddresses])

  const processorContracts = useMemo<ContractFunctionParameters[]>(
    () =>
      addresses.map(
        (address) =>
          ({
            address,
            abi: flapTaxTokenV3Abi,
            functionName: 'taxProcessor',
            chainId: PLATFORM_CHAIN_ID,
          }) as ContractFunctionParameters,
      ),
    [addresses],
  )

  const processorQuery = useReadContracts({
    contracts: processorContracts,
    query: {
      enabled: processorContracts.length > 0,
      staleTime: 30_000,
      refetchInterval: 30_000,
    },
  })

  const processors = useMemo(
    () =>
      addresses.flatMap((address, index) => {
        const processor = readAddress(slot(processorQuery.data, index)?.result)
        return processor ? [{ token: address, processor }] : []
      }),
    [addresses, processorQuery.data],
  )

  const counterContracts = useMemo<ContractFunctionParameters[]>(
    () =>
      processors.flatMap((item) =>
        COUNTERS.map(
          (functionName) =>
            ({
              address: item.processor,
              abi: taxProcessorAbi,
              functionName,
              chainId: PLATFORM_CHAIN_ID,
            }) as ContractFunctionParameters,
        ),
      ),
    [processors],
  )

  const counterQuery = useReadContracts({
    contracts: counterContracts,
    query: {
      enabled: counterContracts.length > 0,
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  })

  const byAddress = useMemo(() => {
    const map: Record<string, TaxChannelYield | null> = {}
    if (!processorQuery.data) return map

    for (const address of addresses) {
      map[address.toLowerCase()] = null
    }

    processors.forEach((item, index) => {
      const base = index * COUNTERS.length
      const amounts = COUNTERS.map((_, offset) =>
        slot(counterQuery.data, base + offset)?.status === 'success'
          ? readAmount(slot(counterQuery.data, base + offset)?.result)
          : undefined,
      )
      if (amounts.some((amount) => amount === undefined)) return

      map[item.token.toLowerCase()] = {
        marketingBNB: amounts[0]!,
        burnedTokens: amounts[1]!,
        dividendBNB: amounts[2]!,
        liquidityBNB: amounts[3]!,
        liquidityTokens: amounts[4]!,
      }
    })

    return map
  }, [addresses, counterQuery.data, processorQuery.data, processors])

  const isLoading =
    (processorContracts.length > 0 && processorQuery.isLoading) ||
    (counterContracts.length > 0 && counterQuery.isLoading)

  const refetch = () =>
    Promise.all([processorQuery.refetch(), counterQuery.refetch()])

  return { byAddress, isLoading, refetch }
}
