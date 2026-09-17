import axios from 'axios'
import { m } from '@/paraglide/messages.js'

interface ErrorResponse {
  message?: unknown
}

export class ApiError extends Error {
  readonly code?: number
  readonly status?: number

  constructor(
    message: string,
    options: { code?: number; status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as ErrorResponse | undefined)
      ?.message

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return new ApiError(responseMessage, {
        status: error.response?.status,
        cause: error,
      })
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(m.request_timeout(), { cause: error })
    }

    if (!error.response) {
      return new ApiError(m.network_connection_failed(), { cause: error })
    }

    return new ApiError(
      m.http_request_failed({ status: error.response.status }),
      { status: error.response.status, cause: error },
    )
  }

  return new ApiError(
    error instanceof Error && error.message ? error.message : m.request_failed(),
    { cause: error },
  )
}
