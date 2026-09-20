import { useConfig } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { decodeEventLog, type Address, type Hex } from 'viem'

import { executeContractTx } from '@/hooks/use-contract-tx'
import { getCoordinatorFactory } from '@/contracts'
import { findVanitySalt } from '@/lib/vanity-salt'

const SECONDS_PER_DAY = 86_400

export interface CreateTokenParams {
  account: Address
  name: string
  symbol: string
  meta: string
  buyTax: number
  sellTax: number
  feeRecipient: Address
  taxDurationDays: number
  antiFarmerDurationDays: number
  salt?: Hex
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
    const taxDuration = BigInt(
      Math.round(params.taxDurationDays * SECONDS_PER_DAY),
    )
    const antiFarmerDuration = BigInt(
      Math.round(params.antiFarmerDurationDays * SECONDS_PER_DAY),
    )

    if (taxDuration <= 0n || antiFarmerDuration > taxDuration) {
      throw new Error('Invalid token duration configuration')
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

    const { hash: txHash, receipt } = await executeContractTx(config, {
      ...coordinator,
      functionName: 'createToken',
      account: params.account,
      args: [
        {
          name: params.name.trim(),
          symbol: params.symbol.trim(),
          meta: params.meta,
          buyTax: percentToBps(params.buyTax),
          sellTax: percentToBps(params.sellTax),
          feeRecipient: params.feeRecipient,
          taxDuration,
          antiFarmerDuration,
          liqExpectedOutputAmount: 0n,
        },
        salt,
      ],
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
