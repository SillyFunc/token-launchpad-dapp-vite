import type { ReactNode } from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import type {
  ToastManagerAddOptions,
  ToastManagerPromiseOptions,
  ToastManagerUpdateOptions,
} from '@base-ui/react/toast'

type AppToastType = 'success' | 'info' | 'warning' | 'error' | 'loading'
type AppToastOptions = Omit<
  ToastManagerAddOptions<object>,
  'type' | 'title' | 'description'
>
type ToastPromiseState = string | ToastManagerUpdateOptions<object>

const PROMISE_SUCCESS_TIMEOUT = 4000
const PROMISE_ERROR_TIMEOUT = 8000
/**
 * Plain error toasts auto-close after the same duration as plain success
 * toasts (the Base UI provider default of 5000ms).
 */
const ERROR_TIMEOUT = 5000

export const toastManager = ToastPrimitive.createToastManager()

function createToastMethod(type: AppToastType) {
  return (
    title: ReactNode,
    description?: ReactNode,
    options?: AppToastOptions,
  ) => toastManager.add({ ...options, type, title, description })
}

/**
 * Error toasts close on our own timer instead of the store's: Base UI pauses
 * its timers while the window is blurred (e.g. a wallet popup stole focus,
 * which is exactly when contract errors fire), and a stuck pause can leave
 * the toast open forever. `closeAfter` is a plain setTimeout, so it fires
 * regardless of focus/hover state. Pass `timeout: 0` to keep an error sticky.
 */
function errorToast(
  title: ReactNode,
  description?: ReactNode,
  options?: AppToastOptions,
) {
  const id = toastManager.add({
    ...options,
    type: 'error',
    title,
    description,
    timeout: 0,
  })
  closeAfter(id, options?.timeout ?? ERROR_TIMEOUT)
  return id
}

function normalizePromiseState(state: ToastPromiseState) {
  return typeof state === 'string' ? { title: state } : state
}

function resolvePromiseState<Value>(
  state: ToastPromiseState | ((value: Value) => ToastPromiseState),
  value: Value,
) {
  return normalizePromiseState(
    typeof state === 'function' ? state(value) : state,
  )
}

function closeAfter(id: string, timeout: number) {
  if (timeout <= 0) return
  globalThis.setTimeout(() => toastManager.close(id), timeout)
}

function promiseToast<Value>(
  promise: Promise<Value>,
  options: ToastManagerPromiseOptions<Value, object>,
) {
  const loading = normalizePromiseState(options.loading)
  const id = toastManager.add({ ...loading, type: 'loading', timeout: 0 })

  return promise.then(
    (value) => {
      const success = resolvePromiseState(options.success, value)
      const timeout = success.timeout ?? PROMISE_SUCCESS_TIMEOUT
      toastManager.update(id, { ...success, type: 'success', timeout: 0 })
      closeAfter(id, timeout)
      return value
    },
    (error: unknown) => {
      const failure = resolvePromiseState(options.error, error)
      const timeout = failure.timeout ?? PROMISE_ERROR_TIMEOUT
      toastManager.update(id, { ...failure, type: 'error', timeout: 0 })
      closeAfter(id, timeout)
      throw error
    },
  )
}

export const toast = {
  success: createToastMethod('success'),
  info: createToastMethod('info'),
  warning: createToastMethod('warning'),
  error: errorToast,
  loading: createToastMethod('loading'),
  promise: promiseToast,
  dismiss: (id?: string) => toastManager.close(id),
}
