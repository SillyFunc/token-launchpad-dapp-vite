import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CoinsIcon, RocketIcon } from 'lucide-react'
import type { Address } from 'viem'
import { presaleAbi } from '@/contracts'

import type { BoardItemResponse } from '@/api/board'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useWriteContractTx } from '@/hooks/use-contract-tx'
import { getContractErrorMessage } from '@/lib/contract-error'
import { toast } from '@/lib/toast'
import { m } from '@/paraglide/messages.js'
import { TokenBasicDetails, TokenCardShell } from './token-card-parts'
import type { TokenCardState } from './token-card-model'

export interface StandaloneTokenCardProps {
  state: TokenCardState
  onPresale: (token: BoardItemResponse, tokenAddress: Address) => void
  onView: (tokenAddress: Address) => void
}

/**
 * Issued without a presale (`presaleEnabled === false`, still on the
 * BondingCurve): the token can either be claimed outright — which launches it
 * immediately — or handed off to presale setup.
 */
export const StandaloneTokenCard: React.FC<StandaloneTokenCardProps> = ({
  state,
  onPresale,
  onView,
}) => {
  const { token, gate, tokenAddress: resolvedAddress, stage } = state

  const canClaim = stage === 'prelaunch' && Boolean(gate.presaleAddress)
  const isClaimedDirectly = stage === 'live' && gate.tokensClaimed

  return (
    <TokenCardShell
      token={token}
      tokenName={state.tokenName}
      tokenSymbol={state.tokenSymbol}
      stage={stage}
      tokenAddress={resolvedAddress}
      details={<TokenBasicDetails state={state} />}
      footer={
        <>
          {stage === 'prelaunch' && (
            <Button
              type="button"
              variant="default"
              disabled={!resolvedAddress}
              onClick={() =>
                resolvedAddress && onPresale(token, resolvedAddress)
              }
              className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-40"
            >
              <RocketIcon aria-hidden="true" />
              <span>{m.dashboard_setup_presale()}</span>
            </Button>
          )}

          {canClaim && gate.presaleAddress && (
            <ClaimAllTokensButton presaleAddress={gate.presaleAddress} />
          )}

          {isClaimedDirectly && (
            <>
              <p className="text-center text-xs text-green-300">
                {m.dashboard_token_claimed()}
              </p>
              <ViewDetailsButton
                tokenAddress={resolvedAddress}
                onView={onView}
              />
            </>
          )}

          {stage !== 'prelaunch' && !isClaimedDirectly && (
            <ViewDetailsButton
              tokenAddress={resolvedAddress}
              disabled={stage === 'syncing' || !resolvedAddress}
              onView={onView}
            />
          )}
        </>
      }
    />
  )
}

const ViewDetailsButton: React.FC<{
  tokenAddress?: Address
  disabled?: boolean
  onView: (tokenAddress: Address) => void
}> = ({ tokenAddress, disabled = false, onView }) => (
  <Button
    type="button"
    variant="default"
    onClick={() => tokenAddress && onView(tokenAddress)}
    disabled={disabled || !tokenAddress}
    className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-40"
  >
    <RocketIcon aria-hidden="true" />
    <span>{m.dashboard_view_token()}</span>
  </Button>
)

function ClaimAllTokensButton({
  presaleAddress,
}: {
  presaleAddress: Address
}) {
  const { execute, isPending } = useWriteContractTx()
  const queryClient = useQueryClient()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaim = async () => {
    if (isClaiming) return

    setIsClaiming(true)
    try {
      await execute({
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'claimAllTokens',
      })
      await queryClient
        .invalidateQueries({ queryKey: ['readContracts'] })
        .catch(() => undefined)
      setIsConfirmOpen(false)
      toast.success(
        m.token_transaction_confirmed(),
        m.dashboard_claim_tokens_success(),
      )
    } catch (error) {
      toast.error(m.token_transaction_failed(), getContractErrorMessage(error))
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsConfirmOpen(true)}
        className="border-[#484b51] bg-[#131516] font-bold text-white hover:bg-white/10"
      >
        <CoinsIcon aria-hidden="true" />
        <span>{m.dashboard_claim_tokens()}</span>
      </Button>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-5 border border-[#484b51] bg-[#131516] text-white ring-0"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {m.dashboard_claim_confirm_title()}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-neutral-400">
              {m.dashboard_claim_confirm_description()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isClaiming}
                  className="border-[#484b51] bg-transparent font-semibold text-white hover:bg-white/10"
                />
              }
            >
              {m.dashboard_claim_cancel()}
            </DialogClose>
            <Web3ActionButton
              onAction={handleClaim}
              loading={isClaiming || isPending}
              loadingText={m.dashboard_claiming_tokens()}
              className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-50"
            >
              <CoinsIcon aria-hidden="true" />
              <span>{m.dashboard_claim_confirm_action()}</span>
            </Web3ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
