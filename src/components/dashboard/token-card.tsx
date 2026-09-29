import type { Address } from 'viem'

import type { BoardItemResponse } from '@/api/board'
import type { TokenGateResult } from '@/hooks/use-token-gate'
import { PresaleTokenCard } from './presale-token-card'
import { StandaloneTokenCard } from './standalone-token-card'
import { UnissuedTokenCard } from './unissued-token-card'
import {
  buildTokenCardState,
  getCardMode,
  getReservedAddress,
} from './token-card-model'

export interface TokenCardProps {
  token: BoardItemResponse
  gate: TokenGateResult
  /** Resolved on-chain address; `undefined` until the token exists. */
  tokenAddress?: Address
  /** Reports a freshly issued address back to the page-level gate reader. */
  onIssued: (tokenAddress: Address) => void
  onEdit: (token: BoardItemResponse) => void
  onPresale: (
    token: BoardItemResponse,
    tokenAddress: Address,
    options?: { allowEditAfterRelaunch?: boolean },
  ) => void
  onView: (tokenAddress: Address) => void
}

/**
 * Dashboard entry point. The on-chain read is owned by the page
 * (`useTokenGates`) and passed in, so every card shares page-level multicalls
 * instead of running its own. This component only routes to the card that
 * matches the token's launch state:
 *
 * - `UnissuedTokenCard` — exists off-chain only
 * - `PresaleTokenCard` — a presale was configured
 * - `StandaloneTokenCard` — issued without a presale (claim or set one up)
 */
export function TokenCard({
  token,
  gate,
  tokenAddress,
  onIssued,
  onEdit,
  onPresale,
  onView,
}: TokenCardProps) {
  const reservedAddress = getReservedAddress(token, tokenAddress)
  const state = buildTokenCardState(token, gate, tokenAddress, reservedAddress)

  switch (getCardMode(state)) {
    case 'unissued':
      return (
        <UnissuedTokenCard state={state} onIssued={onIssued} onEdit={onEdit} />
      )
    case 'presale':
      return (
        <PresaleTokenCard state={state} onPresale={onPresale} onView={onView} />
      )
    default:
      return (
        <StandaloneTokenCard
          state={state}
          onPresale={onPresale}
          onView={onView}
        />
      )
  }
}
