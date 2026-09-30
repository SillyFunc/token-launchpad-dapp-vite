import { useReadContract } from 'wagmi'
import type { Address } from 'viem'

import { flapTaxTokenV3Abi, getPancakeRouter } from '@/contracts'
import { PLATFORM_CHAIN_ID, WRAPPED_NATIVE_ADDRESS } from '@/lib/web3'

export type SwapSide = 'buy' | 'sell'

/** Default slippage applied on top of the taxed quote. */
export const SWAP_SLIPPAGE_BPS = 1_000

export interface SwapQuoteParams {
  side: SwapSide
  amountIn?: bigint
  tokenAddress?: Address
  /** Gate tax (bps), used until the live on-chain rate resolves. */
  fallbackTaxBps?: number
}

export interface SwapQuote {
  /** Router quote before tax. */
  quotedOut: bigint | null
  /** Expected amount after buy/sell tax. */
  expectedOut: bigint | null
  /** `expectedOut` with slippage applied; used as `amountOutMin`. */
  minOut: bigint | null
  taxBps: number
  isLoading: boolean
}

const BPS = 10_000n

/**
 * Quotes a buy/sell against the Pancake V2 router. The tax rate is re-read on
 * every quote (rates are fixed by the contract but should not be cached), with
 * the gate value as the fallback until the read resolves.
 */
export function useSwapQuote({
  side,
  amountIn,
  tokenAddress,
  fallbackTaxBps,
}: SwapQuoteParams): SwapQuote {
  const router = getPancakeRouter()
  const wbnb = WRAPPED_NATIVE_ADDRESS as Address
  const path: Address[] =
    side === 'buy' ? [wbnb, tokenAddress ?? wbnb] : [tokenAddress ?? wbnb, wbnb]
  const enabled = Boolean(tokenAddress) && amountIn !== undefined && amountIn > 0n

  const { data: amounts, isLoading: isQuoteLoading } = useReadContract({
    ...router,
    functionName: 'getAmountsOut',
    args: enabled ? [amountIn!, path] : undefined,
    chainId: PLATFORM_CHAIN_ID,
    query: {
      enabled,
      staleTime: 0,
      retry: 0,
    },
  })

  const { data: taxRate, isLoading: isTaxLoading } = useReadContract({
    address: tokenAddress,
    abi: flapTaxTokenV3Abi,
    functionName: side === 'buy' ? 'buyTaxRate' : 'sellTaxRate',
    chainId: PLATFORM_CHAIN_ID,
    query: {
      enabled: Boolean(tokenAddress),
      refetchInterval: 15_000,
    },
  })

  const taxBps =
    taxRate === undefined ? (fallbackTaxBps ?? 0) : Number(taxRate)
  const quotedOut = amounts?.[1] ?? null
  const expectedOut =
    quotedOut === null ? null : (quotedOut * (BPS - BigInt(taxBps))) / BPS
  const minOut =
    expectedOut === null
      ? null
      : (expectedOut * (BPS - BigInt(SWAP_SLIPPAGE_BPS))) / BPS

  return {
    quotedOut,
    expectedOut,
    minOut,
    taxBps,
    isLoading: enabled && (isQuoteLoading || isTaxLoading),
  }
}
