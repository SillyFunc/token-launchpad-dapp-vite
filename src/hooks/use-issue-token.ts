import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAddress, type Address, type Hex } from 'viem'
import { useConfig, useConnection } from 'wagmi'

import type { BoardItemResponse } from '@/api/board'
import { parseTxHash } from '@/api/token'
import { boardKeys } from '@/hooks/use-board'
import { useCreateToken } from '@/hooks/use-create-token'
import { requestAuthSignature } from '@/lib/auth'
import { getContractErrorMessage } from '@/lib/contract-error'
import { toast } from '@/lib/toast'
import { m } from '@/paraglide/messages.js'

export interface UseIssueTokenOptions {
  /**
   * Called with the freshly issued token address so the caller can point its
   * on-chain reads at the new contract before the board query refetches.
   */
  onIssued?: (tokenAddress: Address) => void
}

/**
 * Drives the "issue token" action from a dashboard card: on-chain `createToken`,
 * backend tx-hash sync, and cache invalidation.
 */
export function useIssueToken(
  token: BoardItemResponse,
  { onIssued }: UseIssueTokenOptions = {},
) {
  const config = useConfig()
  const { address: connectedAddress } = useConnection()
  const queryClient = useQueryClient()
  const { createToken } = useCreateToken()
  const [isIssuing, setIsIssuing] = useState(false)

  const issueToken = async () => {
    if (!connectedAddress || isIssuing) return

    if (!isAddress(token.feeRecipient)) {
      toast.error(
        m.token_transaction_failed(),
        m.dashboard_issue_invalid_recipient(),
      )
      return
    }

    setIsIssuing(true)
    try {
      const auth = await requestAuthSignature(config, connectedAddress)
      const salt = /^0x[\da-fA-F]{64}$/.test(token.salt)
        ? (token.salt as Hex)
        : undefined
      const result = await createToken({
        account: connectedAddress,
        name: token.name,
        symbol: token.symbol,
        meta: token.meta || token.zhIntroduction || token.enIntroduction || '',
        buyTax: token.buyTax ?? 0,
        sellTax: token.sellTax ?? 0,
        feeRecipient: token.feeRecipient,
        taxDurationDays: Number(token.taxDuration) || 30,
        antiFarmerDurationDays: Number(token.antiFarmerDuration) || 0,
        salt,
      })

      onIssued?.(result.tokenAddress)
      toast.success(
        m.dashboard_issue_success(),
        m.dashboard_issue_success_description(),
      )

      try {
        await parseTxHash({
          id: token.id,
          hash: result.txHash,
          ...auth,
        })
      } catch {
        toast.warning(
          m.dashboard_issue_sync_pending(),
          m.dashboard_issue_sync_pending_description(),
        )
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['readContracts'] }),
      ]).catch(() => undefined)
    } catch (error) {
      toast.error(
        m.token_transaction_failed(),
        getContractErrorMessage(error),
      )
    } finally {
      setIsIssuing(false)
    }
  }

  return { isIssuing, issueToken }
}
