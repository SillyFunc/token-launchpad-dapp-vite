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
  /** Dividends the connected wallet has already withdrawn (WBNB wei). */
  withdrawn: bigint | undefined
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
      contracts.push(
        {
          address: dividendAddress,
          abi: dividendAbi,
          functionName: 'withdrawableDividendOf',
          args: [account],
          chainId: PLATFORM_CHAIN_ID,
        } as ContractFunctionParameters,
        {
          address: dividendAddress,
          abi: dividendAbi,
          functionName: 'withdrawnDividends',
          args: [account],
          chainId: PLATFORM_CHAIN_ID,
        } as ContractFunctionParameters,
      )
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
    const readBigInt = (slot: { status?: string; result?: unknown } | undefined) =>
      slot?.status === 'success' && typeof slot.result === 'bigint'
        ? slot.result
        : undefined
    const data = infoQuery.data
    return {
      minimumShareBalance: readBigInt(data?.[0]),
      withdrawable: account ? readBigInt(data?.[1]) : undefined,
      withdrawn: account ? readBigInt(data?.[2]) : undefined,
    }
  }, [dividendAddress, account, infoQuery.data])

  return {
    info,
    dividendAddress,
    isLoading: dividendQuery.isLoading || infoQuery.isLoading,
  }
}
