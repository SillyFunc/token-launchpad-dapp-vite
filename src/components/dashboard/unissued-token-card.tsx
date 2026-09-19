import { PencilIcon, RocketIcon } from 'lucide-react'
import type { Address } from 'viem'

import type { BoardItemResponse } from '@/api/board'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { Button } from '@/components/ui/button'
import { useIssueToken } from '@/hooks/use-issue-token'
import { m } from '@/paraglide/messages.js'
import { TokenBasicDetails, TokenCardShell } from './token-card-parts'
import type { TokenCardState } from './token-card-model'

export interface UnissuedTokenCardProps {
  state: TokenCardState
  /** Keeps the dispatcher's on-chain read pointed at the new token. */
  onIssued: (tokenAddress: Address) => void
  onEdit: (token: BoardItemResponse) => void
}

/**
 * A token that only exists off-chain. It has no launch mode yet, so the only
 * actions are editing its metadata and issuing it on-chain — which is what
 * moves it to one of the two launch cards.
 */
export const UnissuedTokenCard: React.FC<UnissuedTokenCardProps> = ({
  state,
  onIssued,
  onEdit,
}) => {
  const { token, stage } = state
  const { isIssuing, issueToken } = useIssueToken(token, { onIssued })

  return (
    <TokenCardShell
      token={token}
      tokenName={state.tokenName}
      tokenSymbol={state.tokenSymbol}
      stage={stage}
      tokenAddress={state.tokenAddress}
      details={<TokenBasicDetails state={state} />}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onEdit(token)}
            disabled={isIssuing}
            className="border-[#484b51] bg-[#131516] font-bold text-white hover:bg-white/10"
          >
            <PencilIcon aria-hidden="true" />
            <span>{m.dashboard_edit_token()}</span>
          </Button>
          <Web3ActionButton
            onAction={issueToken}
            loading={isIssuing}
            loadingText={m.dashboard_issuing_token()}
            className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-50"
          >
            <RocketIcon aria-hidden="true" />
            <span>{m.dashboard_issue_token()}</span>
          </Web3ActionButton>
        </>
      }
    />
  )
}
