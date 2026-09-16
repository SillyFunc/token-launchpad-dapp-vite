import type { ApiEnvelope } from '@/api/types'
import axios from 'axios'

export const DEFAULT_REQUEST_ERROR_MESSAGE = '请求失败，请稍后重试'

export function getTransportErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = (
      error.response?.data as Partial<ApiEnvelope> | undefined
    )?.message
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return '请求超时，请稍后重试'
    }
    if (!error.response) {
      return '网络连接失败，请检查网络后重试'
    }
    return `请求失败（HTTP ${error.response.status}）`
  }
  return error instanceof Error && error.message
    ? error.message
    : DEFAULT_REQUEST_ERROR_MESSAGE
}

/**
 * 业务逻辑异常类
 * 继承自 Error，可提供强类型的 code 和 msg 以供业务逻辑捕获和判断
 */
export class ApiError extends Error {
  public readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
    // 恢复原型链以确保 instanceof 能够正常工作
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}