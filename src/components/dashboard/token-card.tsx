import { useState } from 'react'
import type { Address } from 'viem'

import type { BoardItemResponse } from '@/api/board'
import { useTokenGate } from '@/hooks/use-token-gate'
import { PresaleTokenCard } from './presale-token-card'
import { StandaloneTokenCard } from './standalone-token-card'
import { UnissuedTokenCard } from './unissued-token-card'
import {
  buildTokenCardState,
  getCardMode,
  getReservedAddress,
  getTokenAddress,
} from './token-card-model'

export interface TokenCardProps {
  token: BoardItemResponse
  onEdit: (token: BoardItemResponse) => void
  onPresale: (
    token: BoardItemResponse,
    tokenAddress: Address,
    options?: { allowEditAfterRelaunch?: boolean },
  ) => void
  onView: (tokenAddress: Address) => void
}

/**
 * Dashboard entry point. It owns the single on-chain read (`useTokenGate`) and
 * routes to the card that matches the token's launch state:
 *
 * - `UnissuedTokenCard` — exists off-chain only
 * - `PresaleTokenCard` — a presale was configured
 * - `StandaloneTokenCard` — issued without a presale (claim or set one up)
 */
export function TokenCard({
  token,
  onEdit,
  onPresale,
  onView,
}: TokenCardProps) {
  const [issuedAddress, setIssuedAddress] = useState<Address>()
  const tokenAddressCandidate = issuedAddress ?? getTokenAddress(token)
  const gate = useTokenGate(tokenAddressCandidate, token.presaleAddress)
  const tokenAddress =
    issuedAddress ?? (gate.tokenExists ? tokenAddressCandidate : undefined)
  const reservedAddress = getReservedAddress(token, tokenAddress)
  const state = buildTokenCardState(token, gate, tokenAddress, reservedAddress)

  switch (getCardMode(state)) {
    case 'unissued':
      return (
        <UnissuedTokenCard
          state={state}
          onIssued={setIssuedAddress}
          onEdit={onEdit}
        />
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
