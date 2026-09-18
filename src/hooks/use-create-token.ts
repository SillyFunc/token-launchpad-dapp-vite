import { useConfig } from 'wagmi'
import {
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions'
import { decodeEventLog, type Address, type Hex } from 'viem'
import { getCoordinatorFactory } from '@/lib/contracts'
import { findVanitySalt } from '@/lib/vanity-salt'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'

const coordinator = getCoordinatorFactory()
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
        chainId: PLATFORM_CHAIN_ID,
      }),
      params.salt
        ? Promise.resolve(params.salt)
        : findVanitySalt().then((result) => result.salt),
    ])

    const txHash = await writeContract(config, {
      ...coordinator,
      functionName: 'createToken',
      account: params.account,
      chainId: PLATFORM_CHAIN_ID,
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

    const receipt = await waitForTransactionReceipt(config, {
      hash: txHash,
      chainId: PLATFORM_CHAIN_ID,
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
