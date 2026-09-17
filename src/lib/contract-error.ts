import { m } from '@/paraglide/messages.js'

export function getContractErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return m.token_transaction_failed_description()

  const message = error.message.toLowerCase()
  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('4001')
  ) {
    return m.token_transaction_rejected()
  }

  return error.message.split('\n')[0] || m.token_transaction_failed_description()
}
