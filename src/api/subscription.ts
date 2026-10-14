import { get, postForm } from '@/lib/http/client'
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

export interface PresaleBeforeParams {
  address: string
  presaleAddress: string
  payAmount: string
}

/** Step 1 after a successful subscribe: returns `{ id }` for step 2. */
export function presaleBefore(params: PresaleBeforeParams, signal?: AbortSignal) {
  return postForm<{ id: number }>('deposit/buyTokenRecord/presaleBefore', params, signal)
}

export interface PresaleAfterParams {
  id: number
  address: string
  message: string
  signature: string
  txHash: string
}

/** Step 2: attaches the on-chain tx hash and the wallet signature to the record. */
export function presaleAfter(params: PresaleAfterParams, signal?: AbortSignal) {
  return postForm<void>('deposit/buyTokenRecord/presaleAfter', params, signal)
}
