import { useQuery } from '@tanstack/react-query'
import { useConfig, type Config } from 'wagmi'
import { readContract, readContracts } from 'wagmi/actions'
import {
  formatUnits,
  isAddress,
  zeroAddress,
  type Address,
  type ContractFunctionParameters,
} from 'viem'

import {
  dividendAbi,
  flapTaxTokenV3Abi,
  getCoordinatorFactory,
  presaleAbi,
} from '@/contracts'
import { pairQuoteAbi, quoteBnbPrice } from '@/hooks/use-token-price'
import { PLATFORM_CHAIN_ID, WRAPPED_NATIVE_ADDRESS } from '@/lib/web3'

export interface HeldToken {
  address: Address
  name: string
  symbol: string
  balance: bigint
  priceBNB: number | null
  dividendContract?: Address
  claimableBNB: bigint | null
}

const PAIR_PAGE_SIZE = 50n
const BALANCE_BATCH_SIZE = 50

interface TokenPair {
  tokenAddress: Address
  tokenName: string
  tokenSymbol: string
  presaleAddress?: Address
}

interface HeldDraft {
  address: Address
  name: string
  symbol: string
  balance: bigint
  presaleAddress?: Address
}

function isTokenPair(value: unknown): value is TokenPair {
  if (!value || typeof value !== 'object') return false
  const pair = value as Record<string, unknown>
  return (
    typeof pair.tokenAddress === 'string' &&
    isAddress(pair.tokenAddress, { strict: false }) &&
    typeof pair.tokenName === 'string' &&
    typeof pair.tokenSymbol === 'string' &&
    typeof pair.presaleAddress === 'string' &&
    isAddress(pair.presaleAddress, { strict: false })
  )
}

function optionalAddress(value: string): Address | undefined {
  return value.toLowerCase() === zeroAddress ? undefined : (value as Address)
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
}

function readSlot(results: readonly unknown[], index: number) {
  const slot = results[index]
  if (!slot || typeof slot !== 'object' || !('status' in slot)) return undefined
  const value = slot as { status?: string; result?: unknown }
  return value.status === 'success' ? value.result : undefined
}

function claimableBnbOf(
  reads: readonly unknown[],
  dividendHeld: { index: number }[],
  tokenIndex: number,
): bigint | null {
  const dividendIndex = dividendHeld.findIndex((item) => item.index === tokenIndex)
  if (dividendIndex < 0) return null

  const dividendToken = readAddress(readSlot(reads, dividendIndex * 2))
  const amount = readSlot(reads, dividendIndex * 2 + 1)
  if (
    !dividendToken ||
    dividendToken.toLowerCase() !== WRAPPED_NATIVE_ADDRESS.toLowerCase() ||
    typeof amount !== 'bigint'
  ) {
    return null
  }

  return amount
}

function readAddress(value: unknown): Address | undefined {
  if (typeof value !== 'string' || !isAddress(value, { strict: false })) return undefined
  if (value.toLowerCase() === zeroAddress) return undefined
  return value
}

async function withBnbPrices(
  config: Config,
  account: Address,
  held: HeldDraft[],
  signal: AbortSignal,
): Promise<HeldToken[]> {
  if (held.length === 0) return []

  const dividendContracts = held.map((token) => ({
    address: token.address,
    abi: flapTaxTokenV3Abi,
    chainId: PLATFORM_CHAIN_ID,
    functionName: 'dividendContract' as const,
  }))
  const metaContracts = held.flatMap((token) => [
      {
        address: token.address,
        abi: flapTaxTokenV3Abi,
        chainId: PLATFORM_CHAIN_ID,
        functionName: 'mainPool',
      },
      {
        address: token.address,
        abi: flapTaxTokenV3Abi,
        chainId: PLATFORM_CHAIN_ID,
        functionName: 'state',
      },
      {
        address: token.address,
        abi: flapTaxTokenV3Abi,
        chainId: PLATFORM_CHAIN_ID,
        functionName: 'decimals',
      },
  ])
  const [meta, dividendReads] = await Promise.all([
    readContracts(config, {
      allowFailure: true,
      contracts: metaContracts as readonly ContractFunctionParameters[],
    }),
    readContracts(config, {
      allowFailure: true,
      contracts: dividendContracts as readonly ContractFunctionParameters[],
    }),
  ])
  throwIfAborted(signal)

  const dividendHeld = held.flatMap((_, index) => {
    const dividendContract = readAddress(readSlot(dividendReads, index))
    return dividendContract ? [{ index, dividendContract }] : []
  })
  const claimContracts = dividendHeld.flatMap((item) => [
    {
      address: item.dividendContract,
      abi: dividendAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'dividendToken' as const,
    },
    {
      address: item.dividendContract,
      abi: dividendAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'withdrawableDividendOf' as const,
      args: [account] as const,
    },
  ])
  const claimReads =
    claimContracts.length === 0
      ? []
      : await readContracts(config, {
          allowFailure: true,
          contracts: claimContracts as readonly ContractFunctionParameters[],
        })
  throwIfAborted(signal)

  const presaleHeld = held.flatMap((token, index) =>
    token.presaleAddress
      ? [{ index, presaleAddress: token.presaleAddress }]
      : [],
  )
  const presaleContracts = presaleHeld.flatMap((item) => [
    {
      address: item.presaleAddress,
      abi: presaleAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'lpAddress',
    },
    {
      address: item.presaleAddress,
      abi: presaleAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'presaleTokenPrice',
    },
  ])
  const presaleReads =
    presaleContracts.length === 0
      ? []
      : await readContracts(config, {
          allowFailure: true,
          contracts: presaleContracts as readonly ContractFunctionParameters[],
        })
  throwIfAborted(signal)

  const quotes = held.map((token, index) => {
    const presaleIndex = presaleHeld.findIndex((item) => item.index === index)
    const presalePrice =
      presaleIndex >= 0 ? readSlot(presaleReads, presaleIndex * 2 + 1) : undefined
    const decimals = readSlot(meta, index * 3 + 2)
    return {
      token,
      pair:
        readAddress(readSlot(meta, index * 3)) ??
        (presaleIndex >= 0
          ? readAddress(readSlot(presaleReads, presaleIndex * 2))
          : undefined),
      state:
        typeof readSlot(meta, index * 3 + 1) === 'number' ||
        typeof readSlot(meta, index * 3 + 1) === 'bigint'
          ? Number(readSlot(meta, index * 3 + 1))
          : undefined,
      decimals: typeof decimals === 'number' ? decimals : undefined,
      presalePrice:
        typeof presalePrice === 'bigint' && presalePrice > 0n
          ? presalePrice
          : undefined,
    }
  })

  const paired = quotes.flatMap((quote, index) =>
    quote.pair ? [{ index, pair: quote.pair }] : [],
  )
  const pairContracts = paired.flatMap((item) => [
    {
      address: item.pair,
      abi: pairQuoteAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'token0',
    },
    {
      address: item.pair,
      abi: pairQuoteAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'token1',
    },
    {
      address: item.pair,
      abi: pairQuoteAbi,
      chainId: PLATFORM_CHAIN_ID,
      functionName: 'getReserves',
    },
  ])
  const pairReads =
    pairContracts.length === 0
      ? []
      : await readContracts(config, {
          allowFailure: true,
          contracts: pairContracts as readonly ContractFunctionParameters[],
        })
  throwIfAborted(signal)

  return quotes.map((quote, index) => {
    const pairIndex = paired.findIndex((item) => item.index === index)
    const spot =
      pairIndex >= 0 && quote.decimals !== undefined
        ? quoteBnbPrice({
            tokenAddress: quote.token.address,
            token0: readAddress(readSlot(pairReads, pairIndex * 3)),
            token1: readAddress(readSlot(pairReads, pairIndex * 3 + 1)),
            reserves: readSlot(pairReads, pairIndex * 3 + 2),
            tokenDecimals: quote.decimals,
          })
        : null
    const presaleBnb = quote.presalePrice
      ? Number(formatUnits(quote.presalePrice, 18))
      : null
    const presaleQuote =
      presaleBnb !== null && Number.isFinite(presaleBnb) && presaleBnb > 0
        ? presaleBnb
        : null
    const launched = quote.state !== undefined && quote.state >= 2
    const priceBNB =
      quote.state === undefined
        ? (spot ?? presaleQuote)
        : launched
          ? spot
          : presaleQuote

    return {
      address: quote.token.address,
      name: quote.token.name,
      symbol: quote.token.symbol,
      balance: quote.token.balance,
      priceBNB,
      dividendContract: readAddress(readSlot(dividendReads, index)),
      claimableBNB: claimableBnbOf(claimReads, dividendHeld, index),
    }
  })
}

export const heldTokenKeys = {
  all: ['heldTokens'] as const,
  byAccount: (account: Address) =>
    [...heldTokenKeys.all, account.toLowerCase()] as const,
}

export function useHeldTokens(account?: Address) {
  const config = useConfig()

  return useQuery({
    queryKey: account
      ? heldTokenKeys.byAccount(account)
      : heldTokenKeys.all,
    enabled: Boolean(account),
    staleTime: 15_000,
    queryFn: async ({ signal }): Promise<HeldToken[]> => {
      if (!account) return []

      const coordinator = getCoordinatorFactory()
      const count = await readContract(config, {
        ...coordinator,
        chainId: PLATFORM_CHAIN_ID,
        functionName: 'getTotalTokenCount',
      })
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

      const pairs: TokenPair[] = []
      for (let offset = 0n; offset < count; offset += PAIR_PAGE_SIZE) {
        const page = await readContract(config, {
          ...coordinator,
          chainId: PLATFORM_CHAIN_ID,
          functionName: 'getAllTokenPresalePairs',
          args: [offset, PAIR_PAGE_SIZE],
        })
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        if (page.length === 0) break

        for (const item of page) {
          if (!isTokenPair(item)) {
            throw new Error('Unexpected token pair from coordinator')
          }
          if (item.tokenAddress.toLowerCase() === zeroAddress) continue
          pairs.push({
            ...item,
            presaleAddress: optionalAddress(item.presaleAddress),
          })
        }
      }

      const held: HeldDraft[] = []
      for (let index = 0; index < pairs.length; index += BALANCE_BATCH_SIZE) {
        const batch = pairs.slice(index, index + BALANCE_BATCH_SIZE)
        const balances = await readContracts(config, {
          allowFailure: false,
          contracts: batch.map((pair) => ({
            address: pair.tokenAddress,
            abi: flapTaxTokenV3Abi,
            chainId: PLATFORM_CHAIN_ID,
            functionName: 'balanceOf' as const,
            args: [account] as const,
          })),
        })
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

        batch.forEach((pair, batchIndex) => {
          const balance = balances[batchIndex]
          if (typeof balance !== 'bigint' || balance <= 0n) return
          held.push({
            address: pair.tokenAddress,
            name: pair.tokenName,
            symbol: pair.tokenSymbol,
            balance,
            presaleAddress: pair.presaleAddress,
          })
        })
      }

      return withBnbPrices(config, account, held, signal)
    },
  })
}
