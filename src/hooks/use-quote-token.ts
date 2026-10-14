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
 * Reads the quote token a token's tax processor uses (`getQuoteToken()`), via the
 * token's `taxProcessor()`. Two dependent reads: the processor address first, then
 * the quote token. Resolves to `undefined` until both have settled.
 */
export function useQuoteToken(tokenAddress: Address | undefined) {
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

  const quoteQuery = useReadContracts({
    contracts: processor
      ? [
          {
            address: processor,
            abi: taxProcessorAbi,
            functionName: 'getQuoteToken',
            chainId: PLATFORM_CHAIN_ID,
          } as ContractFunctionParameters,
        ]
      : [],
    query: { enabled: Boolean(processor), staleTime: 60_000 },
  })

  const quoteToken = useMemo(
    () => readAddress(quoteQuery.data?.[0]?.result),
    [quoteQuery.data],
  )

  return { quoteToken, isLoading: processorQuery.isLoading || quoteQuery.isLoading }
}
