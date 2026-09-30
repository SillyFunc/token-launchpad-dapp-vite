import { useState } from 'react'
import { useConfig } from 'wagmi'
import { readContract } from 'wagmi/actions'
import type { Address } from 'viem'

import { flapTaxTokenV3Abi, getPancakeRouter } from '@/contracts'
import { useWriteContractTx } from '@/hooks/use-contract-tx'
import { PLATFORM_CHAIN_ID, WRAPPED_NATIVE_ADDRESS } from '@/lib/web3'

import type { SwapSide } from '@/hooks/use-swap-quote'

export type SwapStep = 'idle' | 'approving' | 'swapping'

export interface SwapParams {
  side: SwapSide
  tokenAddress: Address
  amountIn: bigint
  minOut: bigint
  account: Address
}

const DEADLINE_SECONDS = 600

function getDeadline() {
  return BigInt(Math.floor(Date.now() / 1_000) + DEADLINE_SECONDS)
}

/**
 * Executes a buy/sell through the Pancake V2 router. Sells approve the router
 * first when the allowance is short. Writes are pinned to the platform chain
 * by `useWriteContractTx`.
 */
export function useSwap() {
  const config = useConfig()
  const { execute, isPending } = useWriteContractTx()
  const router = getPancakeRouter()
  const [step, setStep] = useState<SwapStep>('idle')

  const approveIfNeeded = async (
    account: Address,
    tokenAddress: Address,
    amountIn: bigint,
  ) => {
    const allowance = await readContract(config, {
      address: tokenAddress,
      abi: flapTaxTokenV3Abi,
      functionName: 'allowance',
      args: [account, router.address],
      chainId: PLATFORM_CHAIN_ID,
    })

    if (allowance >= amountIn) return

    setStep('approving')
    await execute({
      address: tokenAddress,
      abi: flapTaxTokenV3Abi,
      functionName: 'approve',
      args: [router.address, amountIn],
      account,
    })
  }

  const swap = async ({
    side,
    tokenAddress,
    amountIn,
    minOut,
    account,
  }: SwapParams) => {
    try {
      if (side === 'sell') {
        await approveIfNeeded(account, tokenAddress, amountIn)
      }

      setStep('swapping')
      const wbnb = WRAPPED_NATIVE_ADDRESS as Address
      const path: Address[] =
        side === 'buy' ? [wbnb, tokenAddress] : [tokenAddress, wbnb]

      if (side === 'buy') {
        return await execute({
          ...router,
          functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
          args: [minOut, path, account, getDeadline()],
          value: amountIn,
          account,
        })
      }

      return await execute({
        ...router,
        functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
        args: [amountIn, minOut, path, account, getDeadline()],
        account,
      })
    } finally {
      setStep('idle')
    }
  }

  return { swap, isPending, step }
}
