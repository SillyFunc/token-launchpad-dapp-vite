import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useConnection } from 'wagmi'

import { getReservedAddressesByUser } from '@/api/token'

export const reservedAddressKeys = {
  all: ['reserved-addresses'] as const,
  byUser: (address: string | undefined) =>
    [...reservedAddressKeys.all, address ?? ''] as const,
}

export type ReservedAddressStatus = 0 | 1 | 2

export interface ReservedAddressOption {
  address: string
  salt: string
  coinStatus: ReservedAddressStatus
}

function normalizeStatus(status: unknown): ReservedAddressStatus {
  const normalized = Number(status)
  return normalized === 0 || normalized === 1 ? normalized : 2
}

export function useReservedAddresses() {
  const { address } = useConnection()

  const query = useQuery({
    queryKey: reservedAddressKeys.byUser(address),
    queryFn: ({ signal }) => getReservedAddressesByUser(address!, signal),
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  return {
    ...query,
    addresses: query.data ?? [],
  }
}

export function useReservedAddressOptions() {
  const query = useReservedAddresses()
  const options = useMemo<ReservedAddressOption[]>(
    () =>
      (query.data ?? []).map((item) => ({
        address: item.contractAddress,
        salt: item.salt,
        coinStatus: normalizeStatus(item.coinStatus),
      })),
    [query.data],
  )

  return {
    ...query,
    data: options,
  }
}
