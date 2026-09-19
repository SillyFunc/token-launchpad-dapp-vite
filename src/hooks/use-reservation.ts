import { useConfig, useReadContract } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { formatEther, type Hex } from 'viem'

import { executeContractTx } from '@/hooks/use-contract-tx'
import { getCoordinatorFactory } from '@/lib/contracts'

/** Mainnet fallback when reservationFee cannot be read. Matches current on-chain 0.001 BNB. */
export const FALLBACK_RESERVATION_FEE_WEI = 1_000_000_000_000_000n

const KNOWN_ERRORS = {
  InsufficientReservationFee: 'INSUFFICIENT_RESERVATION_FEE',
  AddressAlreadyReserved: 'ADDRESS_ALREADY_RESERVED',
  AddressAlreadyDeployed: 'ADDRESS_ALREADY_DEPLOYED',
  InvalidSalt: 'INVALID_SALT',
  InvalidVanitySuffix: 'INVALID_VANITY_SUFFIX',
  FactoryDisabled: 'FACTORY_DISABLED',
  NotReserver: 'NOT_RESERVER',
} as const

export type CoordinatorErrorCode =
  | 'USER_REJECTED'
  | 'INSUFFICIENT_FUNDS'
  | 'WRONG_NETWORK'
  | (typeof KNOWN_ERRORS)[keyof typeof KNOWN_ERRORS]

export class CoordinatorError extends Error {
  readonly code: CoordinatorErrorCode
  override readonly cause?: unknown

  constructor(code: CoordinatorErrorCode, cause?: unknown) {
    super(code)
    this.name = 'CoordinatorError'
    this.code = code
    this.cause = cause
  }
}

function toCoordinatorError(err: unknown): CoordinatorError {
  if (err instanceof CoordinatorError) return err

  const message =
    err instanceof Error
      ? err.message
      : String((err as { shortMessage?: string })?.shortMessage ?? err)

  if (
    message.includes('User rejected') ||
    message.includes('rejected the request') ||
    message.includes('user denied')
  ) {
    return new CoordinatorError('USER_REJECTED', err)
  }
  if (
    message.includes('insufficient funds') ||
    message.includes('exceeds balance')
  ) {
    return new CoordinatorError('INSUFFICIENT_FUNDS', err)
  }
  for (const [abiName, code] of Object.entries(KNOWN_ERRORS)) {
    if (message.includes(abiName)) return new CoordinatorError(code, err)
  }

  return err as CoordinatorError
}

export function useReservationFee() {
  const coordinator = getCoordinatorFactory()
  const query = useReadContract({
    ...coordinator,
    functionName: 'reservationFee',
    query: {
      enabled: Boolean(coordinator.address),
      staleTime: 30_000,
    },
  })

  const fee = query.data

  return {
    ...query,
    fee,
    formattedFee: fee === undefined ? undefined : formatEther(fee),
  }
}

export function useReserveTokenAddress() {
  const config = useConfig()
  const coordinator = getCoordinatorFactory()
  const { fee: reservationFee } = useReservationFee()

  const execute = async (salt: Hex) => {
    let fee = reservationFee
    if (fee === undefined) {
      try {
        fee = await readContract(config, {
          ...coordinator,
          functionName: 'reservationFee',
        })
      } catch (error) {
        console.warn('Direct reservationFee read failed:', error)
      }
    }
    if (fee === undefined) fee = FALLBACK_RESERVATION_FEE_WEI

    return executeContractTx(config, {
      ...coordinator,
      functionName: 'reserveTokenAddress',
      args: [salt],
      value: fee,
    })
  }

  return {
    execute: (salt: Hex) => execute(salt).catch((err) => {
      throw toCoordinatorError(err)
    }),
  }
}
