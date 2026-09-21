import { useConfig } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { decodeEventLog, type Address, type Hex } from 'viem'

import { executeContractTx } from '@/hooks/use-contract-tx'
import { getCoordinatorFactory } from '@/contracts'
import type { EncodedBuybackConfig } from '@/lib/buyback-vault'
import { findVanitySalt } from '@/lib/vanity-salt'

const SECONDS_PER_DAY = 86_400
const MAX_ANTI_FARMER_DURATION_DAYS = 365

export interface CreateTokenParams {
  account: Address
  name: string
  symbol: string
  meta: string
  buyTax: number
  sellTax: number
  feeRecipient: Address
  antiFarmerDurationDays: number
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
