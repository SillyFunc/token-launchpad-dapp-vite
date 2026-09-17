import { postForm } from '@/lib/http/client'
import type { PageParams, PageResult } from './types'

export interface BoardListParams extends PageParams {
  name?: string
  address?: string
  model?: 0 | 1
  canSwap?: 0 | 1
}

export type BoardItemResponse = Record<string, unknown>

export function listBoard(params: BoardListParams, signal?: AbortSignal) {
  return postForm<PageResult<BoardItemResponse>>(
    'deposit/exSwap/swapCoinIssuedPage',
    params,
    signal,
  )
}
