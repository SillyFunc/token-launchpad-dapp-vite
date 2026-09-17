import type { Config } from 'wagmi'
import { signMessage } from 'wagmi/actions'

import { getAuthNonce } from '@/api/auth'

export interface AuthSignature {
  address: string
  message: string
  signature: string
}

export async function requestAuthSignature(
  config: Config,
  address: string,
): Promise<AuthSignature> {
  const message = await getAuthNonce(address)
  const signature = await signMessage(config, { message })

  return {
    address,
    message,
    signature,
  }
}
