import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAddress, parseUnits, type Address, type Hex } from 'viem'
import { useConfig, useConnection } from 'wagmi'

import type { BoardItemResponse } from '@/api/board'
import { parseTxHash } from '@/api/token'
import { boardKeys } from '@/hooks/use-board'
import {
  useCreateToken,
  DEFAULT_TAX_DISTRIBUTION,
  type TaxDistributionParams,
} from '@/hooks/use-create-token'
import { requestAuthSignature } from '@/lib/auth'
import type { EncodedBuybackConfig } from '@/lib/buyback-vault'
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

      // Drafts saved before tax allocation existed carry no distribution
      // fields; issue them with the legacy 100%-market fallback.
      const taxDistribution: TaxDistributionParams =
        token.marketBps != null
          ? {
              marketBps: token.marketBps,
              deflationBps: token.deflationBps ?? 0,
              lpBps: token.lpBps ?? 0,
              dividendBps: token.dividendBps ?? 0,
              minimumShareBalance: parseUnits(
                String(token.minDividendBalance ?? '0'),
                18,
              ),
            }
          : DEFAULT_TAX_DISTRIBUTION

      const buyback: EncodedBuybackConfig | undefined =
        token.buybackVaultEnabled === 1
          ? {
              mode: token.mode ?? 0,
              trigger: token.triggerType ?? 0,
              firstExecuteAt: BigInt(token.firstExecuteAt ?? 0),
              intervalSeconds: BigInt(token.intervalSeconds ?? 60),
              triggerAmount: BigInt(token.triggerAmount || '0'),
              buybackAmount: BigInt(token.buybackAmount || '0'),
            }
          : undefined

      const result = await createToken({
        account: connectedAddress,
        name: token.name,
        symbol: token.symbol,
        meta: token.meta || token.zhIntroduction || token.enIntroduction || '',
        buyTax: token.buyTax ?? 0,
        sellTax: token.sellTax ?? 0,
        feeRecipient: token.feeRecipient,
        antiFarmerDurationDays: Number(token.antiFarmerDuration) || 0,
        taxDistribution,
        salt,
        buyback,
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
