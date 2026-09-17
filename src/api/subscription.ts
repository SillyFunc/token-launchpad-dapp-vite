import { get } from '@/lib/http/client'
import type { PageParams, PageResult } from './types'

export interface SubscriptionListParams extends PageParams {
  address: string
  presaleAddress: string
}

export type SubscriptionItemResponse = Record<string, unknown>

export function listSubscription(
  params: SubscriptionListParams,
  signal?: AbortSignal,
) {
  return get<PageResult<SubscriptionItemResponse>>(
    'deposit/exSwap/swapCoinIssuedPage',
    params,
    signal,
  )
}
