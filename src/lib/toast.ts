import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import hotToast, { type ToastOptions } from 'react-hot-toast'

/** Matches react-hot-toast's own `Renderable`: an element, a string, or null. */
type Renderable = ReactElement | string | null
type AppToastOptions = Pick<ToastOptions, 'duration' | 'id' | 'position'>

/**
 * Stacks a title and an optional description into one node. The two-argument
 * call form is kept so existing call sites stay unchanged; the node itself is
 * rendered by react-hot-toast.
 */
function renderMessage(title: ReactNode, description?: ReactNode): Renderable {
  if (description == null || description === '') return toRenderable(title)
  return createElement(
    'div',
    { className: 'flex min-w-0 flex-col gap-0.5' },
    createElement('span', { className: 'text-sm font-medium' }, title),
    createElement('span', { className: 'text-xs opacity-75' }, description),
  )
}

/** Coerces a loose ReactNode into what react-hot-toast accepts. */
function toRenderable(node: ReactNode): Renderable {
  if (node == null || typeof node === 'boolean') return null
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (isValidElement(node)) return node
  return createElement('span', null, node)
}

function success(
  title: ReactNode,
  description?: ReactNode,
  options?: AppToastOptions,
) {
  return hotToast.success(renderMessage(title, description), options)
}

function error(
  title: ReactNode,
  description?: ReactNode,
  options?: AppToastOptions,
) {
  return hotToast.error(renderMessage(title, description), options)
}

/**
 * react-hot-toast has no warning or info variants. Both use the base toast so
 * they follow the library defaults.
 */
function warning(
  title: ReactNode,
  description?: ReactNode,
  options?: AppToastOptions,
) {
  return hotToast(renderMessage(title, description), options)
}

function info(
  title: ReactNode,
  description?: ReactNode,
  options?: AppToastOptions,
) {
  return hotToast(renderMessage(title, description), options)
}

function loading(
  title: ReactNode,
  description?: ReactNode,
  options?: AppToastOptions,
) {
  return hotToast.loading(renderMessage(title, description), options)
}

type PromiseArgs = Parameters<typeof hotToast.promise>

/**
 * Passes straight through to react-hot-toast's `promise`, using its official
 * signature: each message is a string, a JSX element, or a function of the
 * settled value. Durations use the library defaults.
 */
function promise(...args: PromiseArgs) {
  return hotToast.promise(...args)
}

export const toast = {
  success,
  info,
  warning,
  error,
  loading,
  promise,
  dismiss: (id?: string) => hotToast.dismiss(id),
}
