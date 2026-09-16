import type { AxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from '@/api/types'
import { instance } from './client'
import { ApiError, DEFAULT_REQUEST_ERROR_MESSAGE } from './error'
import { notifyRequestError } from './notify'

function unwrap<T>(res: ApiEnvelope<T>, silent = false): T {
  if (res.code === 0) {
    return (res.data !== undefined ? res.data : res) as T
  }
  const message = res.message || DEFAULT_REQUEST_ERROR_MESSAGE
  console.error('[API] 业务请求失败', { code: res.code, message })
  if (!silent) notifyRequestError(message)
  throw new ApiError(res.code, message)
}

export async function get<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await instance.get<ApiEnvelope<T>>(url, { params, ...config })
  return unwrap(res.data, config?.silent)
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await instance.post<ApiEnvelope<T>>(url, data, config)
  return unwrap(res.data, config?.silent)
}
