import { toast } from '@/components/ui/toast'
import { m } from '@/paraglide/messages.js'
import { DEFAULT_REQUEST_ERROR_MESSAGE } from './error'

const REQUEST_TOAST_DEDUP_WINDOW_MS = 1500

let lastRequestToastKey = ''
let lastRequestToastAt = 0

/** 避免同一个失败请求在重试或多个观察者下短时间重复弹窗。 */
export function notifyRequestError(message: string) {
  const text = message.trim() || DEFAULT_REQUEST_ERROR_MESSAGE
  const now = Date.now()
  if (
    text === lastRequestToastKey &&
    now - lastRequestToastAt < REQUEST_TOAST_DEDUP_WINDOW_MS
  ) {
    return
  }
  lastRequestToastKey = text
  lastRequestToastAt = now
  toast.add({ type: 'error', title: m.request_failed(), description: text })
}
