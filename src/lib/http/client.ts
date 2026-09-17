import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { env } from '@/env/client'
import { m } from '@/paraglide/messages.js'
import { ApiError, normalizeApiError } from './error'

interface ApiEnvelope<T> {
  data: T
  code: number
  message: string
}

const client = axios.create({
  baseURL: env.VITE_APP_API_BASE_URL,
  timeout: 10000,
  responseType: 'json',
  withCredentials: true,
})

function unwrap<T>(response: ApiEnvelope<T>): T {
  if (response.code !== 0) {
    throw new ApiError(response.message || m.request_failed(), {
      code: response.code,
    })
  }

  return response.data
}

function encodeParams(data: object): URLSearchParams {
  const params = new URLSearchParams()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)))
      return
    }

    params.append(key, String(value))
  })

  return params
}

async function request<T>(url: string, config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await client.request<ApiEnvelope<T>>({ url, ...config })

    return unwrap(response.data)
  } catch (error) {
    if (axios.isCancel(error)) throw error

    const apiError = normalizeApiError(error)
    console.error('[API] request failed', {
      method: config.method,
      url,
      status: apiError.status,
      code: apiError.code,
      error: apiError,
    })
    throw apiError
  }
}

export function get<T>(
  url: string,
  params?: object,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(url, {
    method: 'GET',
    params: params ? encodeParams(params) : undefined,
    signal,
  })
}

export function postForm<T>(
  url: string,
  data: object,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    data: encodeParams(data),
    signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export function postMultipart<T>(
  url: string,
  data: FormData,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    data,
    signal,
  })
}
