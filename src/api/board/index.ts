import type { AxiosRequestConfig } from 'axios'

import { post } from '@/lib/http'
import type { PageResult } from '../types'
import type { BoardItemResponse, BoardListParams } from './types'

export const boardApi = {
  list: (params: BoardListParams, config?: AxiosRequestConfig) =>
    post<PageResult<BoardItemResponse>>(
      'deposit/exSwap/swapCoinIssuedPage',
      params,
      config,
    ),
}
