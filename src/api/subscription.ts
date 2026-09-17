import { get } from '@/lib/http/client'
import type { PageParams, PageResult } from './types'

export interface SubscriptionListParams extends PageParams {
  address?: string
  presaleAddress?: string
}

export type SubscriptionItemResponse = {
  id: number
  memberId: number
  address: string
  payAmount: number
  payCoin: string
  status: number
  txHash: string
  preIndex: number
  remark: string
  createTime: string
  updateTime: string
  contractAddress: string
  sequences: number
  preCoin: string
  preAmount: number
  blockNumber: number
  presaleStatus: number
}

export function listSubscription(
  params: SubscriptionListParams,
  signal?: AbortSignal,
) {
  return get<PageResult<SubscriptionItemResponse>>(
    'deposit/buyTokenRecord/presalePage',
    params,
    signal,
  )
}
