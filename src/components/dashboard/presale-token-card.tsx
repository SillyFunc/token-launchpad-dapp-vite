import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleStopIcon, CoinsIcon, RocketIcon, TriangleAlertIcon, WalletIcon } from 'lucide-react'
import type { Address } from 'viem'
import { presaleAbi } from '@/contracts'

import type { BoardItemResponse } from '@/api/board'
import { PresaleProgress } from '@/components/common/presale-progress'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatBnbAmount, formatTokenAmount } from '@/lib/format'
import { getContractErrorMessage } from '@/lib/contract-error'
import { toast } from '@/lib/toast'
import { useWriteContractTx } from '@/hooks/use-contract-tx'
import { m } from '@/paraglide/messages.js'
import { DetailRow, TokenBasicDetails, TokenCardShell } from './token-card-parts'
import type { TokenCardState } from './token-card-model'

export interface PresaleTokenCardProps {
  state: TokenCardState
  onPresale: (
    token: BoardItemResponse,
    tokenAddress: Address,
    options?: { allowEditAfterRelaunch?: boolean },
  ) => void
  onView: (tokenAddress: Address) => void
}

/**
 * Presale path (`presaleEnabled === true`): the tokens are held by the presale
 * escrow, so the card drives open / end / relaunch instead of issuance.
 */
export const PresaleTokenCard: React.FC<PresaleTokenCardProps> = ({
  state,
  onPresale,
  onView,
}) => {
  const { token, gate, tokenAddress, stage } = state

  const isOpenAction = stage === 'prelaunch' && Boolean(gate.presaleAddress)
  const isEndAction = stage === 'presale'
  const isFailed = stage === 'failed'
  const showsClaimedNotice = stage === 'live' && gate.tokensClaimed
  // Detail entry for every stage that does not own the footer outright. During
  // an active presale it sits next to "end presale" as a secondary action.
  const showsViewAction = !isOpenAction && !isFailed

  return (
    <TokenCardShell
      token={token}
      tokenName={state.tokenName}
      tokenSymbol={state.tokenSymbol}
      stage={stage}
      tokenAddress={tokenAddress}
      details={<TokenBasicDetails state={state} />}
      presaleDetails={<PresaleDetails state={state} />}
      footer={
        <>
          {isFailed && (
            <>
              <FailedPresaleNotice outstanding={gate.bnbAccumulated} />
              {gate.presaleAddress && tokenAddress && (
                <RelaunchPresaleButton
                  presaleAddress={gate.presaleAddress}
                  disabled={gate.bnbAccumulated > 0n}
                  onRelaunched={() =>
                    onPresale(token, tokenAddress, {
                      allowEditAfterRelaunch: true,
                    })
                  }
                />
              )}
            </>
          )}

          {isEndAction && (
            <EndPresaleButton
              presaleAddress={gate.presaleAddress}
              onSettled={gate.refetch}
            />
          )}

          {isOpenAction && gate.presaleAddress && (
            <OpenPresaleButton presaleAddress={gate.presaleAddress} />
          )}

          {showsViewAction && (
            <Button
              type="button"
              variant={isEndAction ? 'outline' : 'default'}
              onClick={() => tokenAddress && onView(tokenAddress)}
              disabled={stage === 'syncing' || !tokenAddress}
              className={
                isEndAction
                  ? 'border-[#484b51] bg-[#131516] font-bold text-white hover:bg-white/10'
                  : 'border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-40'
              }
            >
              <RocketIcon aria-hidden="true" />
              <span>{m.dashboard_view_token()}</span>
            </Button>
          )}

          {showsClaimedNotice && (
            <p className="text-center text-xs text-green-300">
              {m.dashboard_token_claimed()}
            </p>
          )}
        </>
      }
    />
  )
}

const PresaleDetails: React.FC<{ state: TokenCardState }> = ({ state }) => {
  const { gate, tokenAddress, tokenSymbol } = state

  if (!tokenAddress) return null

  return (
    <div className="flex flex-col gap-3 border border-[#2F3737] bg-[#17191b] p-3 text-xs">
      <div className="flex flex-col divide-y divide-white/5 border-b border-white/5 pb-1">
        <DetailRow
          icon={RocketIcon}
          label={m.dashboard_presale_price()}
          value={state.presalePrice}
          mono
        />
        <DetailRow
          icon={WalletIcon}
          label={m.dashboard_wallet_limit()}
          value={state.walletLimit}
          mono
        />
        <DetailRow
          icon={CoinsIcon}
          label={m.dashboard_raised()}
          value={state.raised}
          mono
        />
        <DetailRow
          icon={CoinsIcon}
          label={m.dashboard_presale_allocation()}
          value={state.tokenAllocation}
          mono
        />
      </div>

      {gate.presaleShare > 0n && (
        <PresaleProgress
          label={m.dashboard_token_progress()}
          value={state.presaleProgress}
          detail={`${formatTokenAmount(gate.tokensSubscribed, gate.tokenDecimals)} / ${formatTokenAmount(gate.presaleShare, gate.tokenDecimals)} ${tokenSymbol}`}
          showMarker
          showDivider
        />
      )}
      {gate.softCap > 0n && (
        <PresaleProgress
          label={m.dashboard_soft_cap_progress()}
          value={state.softCapProgress}
          detail={`${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.softCap)}`}
          showMarker
          showDivider
        />
      )}
      {gate.hardCap > 0n && (
        <PresaleProgress
          label={m.dashboard_hard_cap_progress()}
          value={state.hardCapProgress}
          detail={`${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.hardCap)}`}
          showMarker
          showDivider
        />
      )}
    </div>
  )
}

function FailedPresaleNotice({ outstanding }: { outstanding: bigint }) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Alert
        variant="destructive"
        className="border-red-500/25 bg-red-500/10 text-red-400"
      >
        <TriangleAlertIcon />
        <AlertTitle className="text-red-400">
          {m.dashboard_failed_title()}
        </AlertTitle>
        <AlertDescription className="text-neutral-400">
          {m.dashboard_failed_description()}
        </AlertDescription>
      </Alert>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-400">
          {m.dashboard_failed_outstanding()}
        </span>
        <span className="font-mono font-medium text-[#FFA546]">
          {formatBnbAmount(outstanding)}
        </span>
      </div>
    </div>
  )
}

function RelaunchPresaleButton({
  presaleAddress,
  disabled,
  onRelaunched,
}: {
  presaleAddress: Address
  disabled: boolean
  onRelaunched: () => void
}) {
  const { execute } = useWriteContractTx()
  const queryClient = useQueryClient()
  const [isRelaunching, setIsRelaunching] = useState(false)

  const handleRelaunchPresale = async () => {
    if (disabled || isRelaunching) return

    setIsRelaunching(true)
    try {
      await execute({
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'relaunchPresale',
      })
      await queryClient
        .invalidateQueries({ queryKey: ['readContracts'] })
        .catch(() => undefined)
      toast.success(
        m.token_transaction_confirmed(),
        m.dashboard_relaunch_presale_success(),
      )
      onRelaunched()
    } catch (error) {
      toast.error(m.token_transaction_failed(), getContractErrorMessage(error))
    } finally {
      setIsRelaunching(false)
    }
  }

  return (
    <Web3ActionButton
      onAction={handleRelaunchPresale}
      loading={isRelaunching}
      loadingText={m.dashboard_relaunching_presale()}
      disabled={disabled}
      title={disabled ? m.presale_refunds_outstanding() : undefined}
      className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-40"
    >
      <RocketIcon aria-hidden="true" />
      <span>{m.dashboard_relaunch_presale()}</span>
    </Web3ActionButton>
  )
}

function OpenPresaleButton({
  presaleAddress,
}: {
  presaleAddress: Address
}) {
  const { execute } = useWriteContractTx()
  const queryClient = useQueryClient()
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenPresale = async () => {
    if (isOpening) return

    setIsOpening(true)
    try {
      await execute({
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'openPresale',
      })
      await queryClient
        .invalidateQueries({ queryKey: ['readContracts'] })
        .catch(() => undefined)
      toast.success(
        m.token_transaction_confirmed(),
        m.dashboard_open_presale_success(),
      )
    } catch (error) {
      toast.error(m.token_transaction_failed(), getContractErrorMessage(error))
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Web3ActionButton
      onAction={handleOpenPresale}
      loading={isOpening}
      loadingText={m.dashboard_opening_presale()}
      className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-40"
    >
      <RocketIcon aria-hidden="true" />
      <span>{m.dashboard_open_presale()}</span>
    </Web3ActionButton>
  )
}

function EndPresaleButton({
  presaleAddress,
  onSettled,
}: {
  presaleAddress?: Address
  onSettled: () => Promise<void>
}) {
  const { execute } = useWriteContractTx()
  const queryClient = useQueryClient()
  const [isEnding, setIsEnding] = useState(false)

  const handleEndPresale = async () => {
    if (!presaleAddress || isEnding) return

    setIsEnding(true)
    try {
      await execute({
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'endPresale',
      })
      await Promise.all([
        onSettled(),
        queryClient.invalidateQueries({ queryKey: ['readContracts'] }),
      ])
      toast.success(
        m.token_transaction_confirmed(),
        m.dashboard_end_presale_success(),
      )
    } catch (error) {
      toast.error(m.token_transaction_failed(), getContractErrorMessage(error))
    } finally {
      setIsEnding(false)
    }
  }

  return (
    <Web3ActionButton
      onAction={handleEndPresale}
      loading={isEnding}
      loadingText={m.dashboard_ending_presale()}
      disabled={!presaleAddress}
      className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5"
    >
      <CircleStopIcon aria-hidden="true" />
      <span>{m.dashboard_end_presale()}</span>
    </Web3ActionButton>
  )
}
