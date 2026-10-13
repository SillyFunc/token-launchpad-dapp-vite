import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import {
  isAddress,
  zeroAddress,
  type Address,
  type ContractFunctionParameters,
} from 'viem'

import { dividendAbi, flapTaxTokenV3Abi } from '@/contracts'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'

export interface DividendInfo {
  /** Minimum token balance a wallet must hold to receive dividends (wei). */
  minimumShareBalance: bigint | undefined
  /** Dividends the connected wallet can withdraw now (WBNB wei). */
  withdrawable: bigint | undefined
}

/**
 * Reads the dividend contract of one token. The dividend contract address comes
 * from `token.dividendContract()`; the minimum holding and the connected wallet's
 * withdrawable amount are read from that contract in a second multicall.
 *
 * Only the withdrawable amount depends on `account`; when no wallet is connected
 * it stays `undefined` so the UI can show "--" instead of a fake zero.
 */
export function useDividendInfo(
  tokenAddress: Address | undefined,
  account: Address | undefined,
) {
  const dividendQuery = useReadContracts({
    contracts: tokenAddress
      ? [
          {
            address: tokenAddress,
            abi: flapTaxTokenV3Abi,
            functionName: 'dividendContract',
            chainId: PLATFORM_CHAIN_ID,
          } as ContractFunctionParameters,
        ]
      : [],
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: 30_000,
    },
  })

  const dividendAddress = useMemo(() => {
    const value = dividendQuery.data?.[0]?.result
    if (typeof value !== 'string' || !isAddress(value, { strict: false })) {
      return undefined
    }
    if (value.toLowerCase() === zeroAddress) return undefined
    return value as Address
  }, [dividendQuery.data])

  const infoContracts = useMemo<ContractFunctionParameters[]>(() => {
    if (!dividendAddress) return []
    const contracts: ContractFunctionParameters[] = [
      {
        address: dividendAddress,
        abi: dividendAbi,
        functionName: 'minimumShareBalance',
        chainId: PLATFORM_CHAIN_ID,
      } as ContractFunctionParameters,
    ]
    if (account) {
      contracts.push({
        address: dividendAddress,
        abi: dividendAbi,
        functionName: 'withdrawableDividendOf',
        args: [account],
        chainId: PLATFORM_CHAIN_ID,
      } as ContractFunctionParameters)
    }
    return contracts
  }, [dividendAddress, account])

  const infoQuery = useReadContracts({
    contracts: infoContracts,
    query: {
      enabled: infoContracts.length > 0,
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  })

  const info = useMemo<DividendInfo | null>(() => {
    if (!dividendAddress) return null
    const minimum = infoQuery.data?.[0]
    const withdrawable = account ? infoQuery.data?.[1] : undefined
    return {
      minimumShareBalance:
        minimum?.status === 'success' && typeof minimum.result === 'bigint'
          ? minimum.result
          : undefined,
      withdrawable:
        withdrawable?.status === 'success' &&
        typeof withdrawable.result === 'bigint'
          ? withdrawable.result
          : undefined,
    }
  }, [dividendAddress, account, infoQuery.data])

  return { info, isLoading: dividendQuery.isLoading || infoQuery.isLoading }
}
