import { post } from '@/lib/http'
import type { RegisterParams } from './types'
import type { AxiosRequestConfig } from 'axios'

export const authApi = {
  create: (params: RegisterParams, config?: AxiosRequestConfig) => {
    return post('deposit/bttk/enter', params, config)
  },
}
