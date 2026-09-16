import { useConnection } from 'wagmi'
import { useQuery } from '@tanstack/react-query'

import { authApi } from '@/api/auth'

export const Auth = () => {
  const { address } = useConnection()

  useQuery({
    queryKey: [address],
    queryFn: () => authApi.create({ address: address! }),
    enabled: Boolean(address),
  })

  return null
}
