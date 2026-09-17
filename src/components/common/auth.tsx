import { useConnection } from 'wagmi'
import { useQuery } from '@tanstack/react-query'

import { registerWallet } from '@/api/auth'

export const Auth = () => {
  const { address } = useConnection()

  useQuery({
    queryKey: ['auth', address],
    queryFn: ({ signal }) => registerWallet({ address: address! }, signal),
    enabled: Boolean(address),
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  return null
}
