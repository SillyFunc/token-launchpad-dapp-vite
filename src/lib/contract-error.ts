import {
  BaseError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
} from 'viem'
import { m } from '@/paraglide/messages.js'

/** Localized reasons for the custom errors users can hit on presale actions. */
const REVERT_MESSAGES: Record<string, () => string> = {
  PresaleNotOpen: m.contract_error_presale_not_open,
  PresaleNotStarted: m.contract_error_presale_not_started,
  PresaleExpired: m.contract_error_presale_expired,
  PresaleSoldOut: m.contract_error_presale_sold_out,
  WalletLimitExceeded: m.contract_error_wallet_limit_exceeded,
  HardcapReached: m.contract_error_hardcap_reached,
  AmountTooSmall: m.contract_error_amount_too_small,
  InvalidStatus: m.contract_error_invalid_status,
  NothingToClaim: m.contract_error_nothing_to_claim,
  PresaleNotExpired: m.contract_error_presale_not_expired,
  LaunchDeadlineNotReached: m.contract_error_launch_deadline_not_reached,
}

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

  if (error instanceof BaseError) {
    if (
      error.walk((cause) => cause instanceof InsufficientFundsError) ||
      // The platform RPC reports it as -32003 "EVM error: OutOfFunds", which
      // viem does not classify as InsufficientFundsError.
      message.includes('outoffunds')
    ) {
      return m.contract_error_insufficient_funds()
    }

    // viem decodes the custom error against the ABI; the first line of
    // `error.message` is only the generic "contract function reverted".
    const reverted = error.walk(
      (cause) => cause instanceof ContractFunctionRevertedError,
    )
    if (reverted instanceof ContractFunctionRevertedError) {
      const errorName = reverted.data?.errorName
      const localized = errorName ? REVERT_MESSAGES[errorName] : undefined
      if (localized) return localized()
      // `reason` is set for require strings (Error(string)) and panics.
      if (reverted.reason) return reverted.reason
      if (errorName) return m.contract_error_unknown({ name: errorName })
    }

    return error.shortMessage
  }

  return error.message.split('\n')[0] || m.token_transaction_failed_description()
}
