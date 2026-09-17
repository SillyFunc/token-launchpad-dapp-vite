import { postForm } from '@/lib/http/client'

export interface RegisterParams {
  address: string
}

export function registerWallet(params: RegisterParams, signal?: AbortSignal) {
  return postForm<void>('deposit/bttk/enter', params, signal)
}

export function getAuthNonce(address: string, signal?: AbortSignal) {
  return postForm<string>(
    'deposit/project/getChainSignNonce',
    { address },
    signal,
  )
}
