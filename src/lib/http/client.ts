import axios from 'axios'
import { getTransportErrorMessage } from './error'
import { notifyRequestError } from './notify'
import { env } from '@/env/client'

export const instance = axios.create({
  baseURL: env.VITE_APP_API_BASE_URL,
  timeout: 10000,
  responseType: 'json',
  withCredentials: true,
})

instance.defaults.transformRequest = [
  (data, headers) => {
    if (
      data instanceof FormData ||
      data instanceof URLSearchParams ||
      data === null ||
      typeof data !== 'object'
    ) {
      return data
    }
    if (Object.values(data).some((v) => v instanceof Blob)) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, item as Blob | string))
        } else {
          formData.append(key, value as Blob | string)
        }
      })
      return formData
    }
    if (headers.getContentType?.()?.includes('application/json')) {
      return data
    }
    const params = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)))
      } else {
        params.append(key, String(value))
      }
    })
    headers.setContentType('application/x-www-form-urlencoded')
    return params.toString()
  },
]

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const silent = Boolean(error?.config?.silent)
    const message = getTransportErrorMessage(error)
    console.error('[API] 请求失败', {
      url: error?.config?.url,
      method: error?.config?.method,
      status: error?.response?.status,
      error,
    })
    if (!silent) notifyRequestError(message)
    return Promise.reject(error)
  },
)
