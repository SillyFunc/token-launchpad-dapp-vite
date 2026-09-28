import { useConfig } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { decodeEventLog, parseEther, type Address, type Hex } from 'viem'

import { executeContractTx } from '@/hooks/use-contract-tx'
import { getCoordinatorFactory } from '@/contracts'
import type { EncodedBuybackConfig } from '@/lib/buyback-vault'
import { findVanitySalt } from '@/lib/vanity-salt'

const SECONDS_PER_DAY = 86_400
const MAX_ANTI_FARMER_DURATION_DAYS = 365

/** Mirrors CoordinatorFactory.MAX_MINIMUM_SHARE_BALANCE (1e9 tokens, 18 decimals). */
const MAX_MINIMUM_SHARE_BALANCE = parseEther('1000000000')

/**
 * Tax distribution across the four channels, in contract units (bps).
 * The contract requires the shares to sum to exactly 10_000 bps.
 */
export interface TaxDistributionParams {
  /** Creator/marketing channel share (bps). */
  marketBps: number
  /** Burn/deflation channel share (bps). */
  deflationBps: number
  /** Liquidity channel share (bps). */
  lpBps: number
  /** Dividend channel share (bps). */
  dividendBps: number
  /**
   * Minimum holding (token wei, 18 decimals) for dividend eligibility.
   * Must be 0n when `dividendBps` is 0, otherwise 1…1e9 tokens.
   */
  minimumShareBalance: bigint
}

/**
 * Fallback for records saved before tax allocation existed: 100% to the
 * market channel, matching the legacy behavior where all tax went to the
 * fee recipient.
 */
export const DEFAULT_TAX_DISTRIBUTION: TaxDistributionParams = {
  marketBps: 10_000,
  deflationBps: 0,
  lpBps: 0,
  dividendBps: 0,
  minimumShareBalance: 0n,
}

export interface CreateTokenParams {
  account: Address
  name: string
  symbol: string
  meta: string
  buyTax: number
  sellTax: number
  feeRecipient: Address
  antiFarmerDurationDays: number
  taxDistribution: TaxDistributionParams
  salt?: Hex
  buyback?: EncodedBuybackConfig
}

export interface CreateTokenResult {
  tokenAddress: Address
  presaleAddress: Address
  txHash: Hex
}

function percentToBps(percent: number) {
  return Math.round(percent * 100)
}

export function useCreateToken() {
  const config = useConfig()
  const coordinator = getCoordinatorFactory()

  const createToken = async (
    params: CreateTokenParams,
  ): Promise<CreateTokenResult> => {
    const antiFarmerDuration = BigInt(
      Math.round(params.antiFarmerDurationDays * SECONDS_PER_DAY),
    )

    if (
      antiFarmerDuration < 0n ||
      params.antiFarmerDurationDays > MAX_ANTI_FARMER_DURATION_DAYS
    ) {
      throw new Error('InvalidAntiFarmerDuration')
    }

    // Mirror the CoordinatorFactory checks so misconfiguration fails before
    // the transaction is sent instead of reverting on-chain.
    const { marketBps, deflationBps, lpBps, dividendBps, minimumShareBalance } =
      params.taxDistribution
    if (marketBps + deflationBps + lpBps + dividendBps !== 10_000) {
      throw new Error('InvalidTaxDistribution')
    }
    if (
      (dividendBps === 0 && minimumShareBalance !== 0n) ||
      (dividendBps > 0 &&
        (minimumShareBalance === 0n ||
          minimumShareBalance > MAX_MINIMUM_SHARE_BALANCE))
    ) {
      throw new Error('InvalidMinimumShareBalance')
    }

    const [creationFee, salt] = await Promise.all([
      readContract(config, {
        ...coordinator,
        functionName: 'creationFee',
      }),
      params.salt
        ? Promise.resolve(params.salt)
        : findVanitySalt().then((result) => result.salt),
    ])

    const tokenConfig = {
      name: params.name.trim(),
      symbol: params.symbol.trim(),
      meta: params.meta,
      buyTax: percentToBps(params.buyTax),
      sellTax: percentToBps(params.sellTax),
      feeRecipient: params.feeRecipient,
      marketBps,
      deflationBps,
      lpBps,
      dividendBps,
      minimumShareBalance,
      antiFarmerDuration,
      liqExpectedOutputAmount: 0n,
    }

    const { hash: txHash, receipt } = await executeContractTx(config, {
      ...coordinator,
      functionName: params.buyback ? 'createTokenWithVault' : 'createToken',
      account: params.account,
      args: params.buyback
        ? [tokenConfig, salt, params.buyback]
        : [tokenConfig, salt],
      value: creationFee,
    })

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== coordinator.address.toLowerCase()) {
        continue
      }

      try {
        const decoded = decodeEventLog({
          abi: coordinator.abi,
          data: log.data,
          topics: log.topics,
        })

        if (decoded.eventName === 'TokenPresalePairCreated') {
          const { token, presale } = decoded.args as {
            token: Address
            presale: Address
          }

          return {
            tokenAddress: token,
            presaleAddress: presale,
            txHash,
          }
        }
      } catch {
        // The receipt can contain unrelated logs from contracts called internally.
      }
    }

    throw new Error('Token creation event was not found in the receipt')
  }

  return { createToken }
}
