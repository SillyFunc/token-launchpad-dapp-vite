import type { PageParams } from '../types'

export interface BoardListParams extends PageParams {
  name?: string
  address?: string
  model?: 0 | 1
  canSwap?: 0 | 1
}

export interface BoardItemResponse {}
