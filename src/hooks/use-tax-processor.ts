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

function readAddress(value: unknown): Address | undefined {
  if (typeof value !== 'string' || !isAddress(value, { strict: false })) {
    return undefined
  }
  if (value.toLowerCase() === zeroAddress) return undefined
  return value as Address
}

/**
 * Reads a token's tax processor (via the token's `taxProcessor()`) and from it:
 * - `quoteToken` (`getQuoteToken()`): the asset tax is swapped into.
 * - `marketAddress`: where the market channel's share is sent. It is the
 *   creator's fee recipient, or the buyback vault when the token uses one, and
 *   is fixed when the processor is initialized.
 * Two dependent reads: the processor address first, then both values in one
 * batch. Each resolves to `undefined` until the reads have settled.
 */
export function useTaxProcessor(tokenAddress: Address | undefined) {
  const processorQuery = useReadContracts({
    contracts: tokenAddress
      ? [
          {
            address: tokenAddress,
            abi: flapTaxTokenV3Abi,
            functionName: 'taxProcessor',
            chainId: PLATFORM_CHAIN_ID,
          } as ContractFunctionParameters,
        ]
      : [],
    query: { enabled: Boolean(tokenAddress), staleTime: 60_000 },
  })

  const processor = useMemo(
    () => readAddress(processorQuery.data?.[0]?.result),
    [processorQuery.data],
  )

  const detailsQuery = useReadContracts({
    contracts: processor
      ? [
          {
            address: processor,
            abi: taxProcessorAbi,
            functionName: 'getQuoteToken',
            chainId: PLATFORM_CHAIN_ID,
          } as ContractFunctionParameters,
          {
            address: processor,
            abi: taxProcessorAbi,
            functionName: 'marketAddress',
            chainId: PLATFORM_CHAIN_ID,
          } as ContractFunctionParameters,
        ]
      : [],
    query: { enabled: Boolean(processor), staleTime: 60_000 },
  })

  const quoteToken = useMemo(
    () => readAddress(detailsQuery.data?.[0]?.result),
    [detailsQuery.data],
  )
  const marketAddress = useMemo(
    () => readAddress(detailsQuery.data?.[1]?.result),
    [detailsQuery.data],
  )

  return {
    quoteToken,
    marketAddress,
    isLoading: processorQuery.isLoading || detailsQuery.isLoading,
  }
}
