import type { ReactNode } from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import type { ToastManagerAddOptions } from '@base-ui/react/toast'

type AppToastType = 'success' | 'info' | 'warning' | 'error' | 'loading'
type AppToastOptions = Omit<
  ToastManagerAddOptions<object>,
  'type' | 'title' | 'description'
>

export const toastManager = ToastPrimitive.createToastManager()

function createToastMethod(type: AppToastType) {
  return (
    title: ReactNode,
    description?: ReactNode,
    options?: AppToastOptions,
  ) => toastManager.add({ ...options, type, title, description })
}

export const toast = {
  success: createToastMethod('success'),
  info: createToastMethod('info'),
  warning: createToastMethod('warning'),
  error: createToastMethod('error'),
  loading: createToastMethod('loading'),
  dismiss: (id?: string) => toastManager.close(id),
}
