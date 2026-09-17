import { useQuery } from '@tanstack/react-query'
import { useConnection } from 'wagmi'

import { getReservedAddressesByUser } from '@/api/token'

export function useReservedAddresses() {
  const { address } = useConnection()

  const query = useQuery({
    queryKey: ['reserved-addresses', address ?? ''],
    queryFn: ({ signal }) => getReservedAddressesByUser(address!, signal),
    enabled: Boolean(address),
    staleTime: 0,
  })

  return {
    ...query,
    addresses: query.data ?? [],
  }
}
