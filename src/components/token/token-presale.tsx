import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useBalance,
  useConnection,
  usePublicClient,
  useReadContracts,
  useWriteContract,
} from 'wagmi'
import { AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { formatEther, parseEther, zeroAddress } from 'viem'
import { presaleAbi } from '@sillyfunc/launchpad-contracts'

import type { TokenGateResult } from '@/hooks/use-token-gate'
import { PresaleProgress } from '@/components/common/presale-progress'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { toast } from '@/lib/toast'
import { getContractErrorMessage } from '@/lib/contract-error'
import {
  formatBnbAmount,
  formatDuration,
  formatTokenAmount,
} from '@/lib/format'
import { getPresaleProgress } from '@/lib/utils'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

const TOKEN_SCALE = 10n ** 18n

function ceilDivide(value: bigint, divisor: bigint): bigint {
  if (divisor <= 0n) return 0n
  return (value + divisor - 1n) / divisor
}

function parseBnbInput(value: string): bigint | null {
  if (!value) return 0n
  try {
    return parseEther(value)
  } catch {
    return null
  }
}

function minimum(values: Array<bigint | null>): bigint | null {
  const validValues = values.filter((value): value is bigint => value !== null)
  return validValues.length > 0
    ? validValues.reduce((current, value) =>
        value < current ? value : current,
      )
    : null
}

function formatCountdown(seconds: number): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const remainingSeconds = seconds % 60
  const clock = [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')

  return days > 0 ? m.token_countdown_days({ days, time: clock }) : clock
}

function PresaleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-xs">
      <span className="text-[#A0A3A7]">{label}</span>
      <span className="text-right font-mono text-foreground">{value}</span>
    </div>
  )
}

function StatusMessage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
      <Clock className="size-6 text-[#FFA546]" aria-hidden="true" />
      <strong className="text-sm text-foreground">{title}</strong>
      <span className="text-xs leading-5 text-[#A0A3A7]">{description}</span>
    </div>
  )
}

export function TokenPresale({
  gate,
  symbol,
}: {
  gate: TokenGateResult
  symbol: string
}) {
  const queryClient = useQueryClient()
  const { address: userAddress } = useConnection()
  const publicClient = usePublicClient()
  const contractWriter = useWriteContract()
  const [subscribeAmount, setSubscribeAmount] = useState('')
  const [nowSeconds, setNowSeconds] = useState(() =>
    Math.floor(Date.now() / 1_000),
  )
  const [pendingAction, setPendingAction] = useState<
    'subscribe' | 'refund' | 'settle' | null
  >(null)
  const queryPresaleAddress = gate.presaleAddress ?? zeroAddress
  const queryUserAddress = userAddress ?? zeroAddress

  const { data: balanceData } = useBalance({
    address: userAddress,
    query: { enabled: Boolean(userAddress), staleTime: 10_000 },
  })
  const userPosition = useReadContracts({
    contracts: [
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'subscribedTokens',
        args: [queryUserAddress],
      },
      {
        address: queryPresaleAddress,
        abi: presaleAbi,
        functionName: 'contributions',
        args: [queryUserAddress],
      },
    ] as const,
    query: {
      enabled: Boolean(gate.presaleAddress && userAddress),
      staleTime: 5_000,
    },
  })

  useEffect(() => {
    if (gate.presaleStatus !== 1) return
    const timer = window.setInterval(
      () => setNowSeconds(Math.floor(Date.now() / 1_000)),
      1_000,
    )
    return () => window.clearInterval(timer)
  }, [gate.presaleStatus])

  const userSubscribedTokens = userPosition.data?.[0]?.result ?? 0n
  const userContribution = userPosition.data?.[1]?.result ?? 0n
  const startTimeSeconds = Number(gate.startTime ?? 0n)
  const endTimeSeconds = Number(gate.endTime ?? 0n)
  const hasNotStarted =
    gate.presaleStatus === 1 &&
    startTimeSeconds > 0 &&
    nowSeconds < startTimeSeconds
  const hasEnded =
    gate.presaleStatus === 1 &&
    endTimeSeconds > 0 &&
    nowSeconds >= endTimeSeconds
  const isPresaleActive =
    gate.presaleStatus === 1 && !hasNotStarted && !hasEnded && !gate.isSoldOut
  const countdownSeconds = hasNotStarted
    ? Math.max(0, startTimeSeconds - nowSeconds)
    : Math.max(0, endTimeSeconds - nowSeconds)
  const parsedAmount = parseBnbInput(subscribeAmount)
  const walletBalance = balanceData?.value ?? null
  const remainingWalletTokens =
    gate.maxBuyPerWallet > 0n
      ? userSubscribedTokens >= gate.maxBuyPerWallet
        ? 0n
        : gate.maxBuyPerWallet - userSubscribedTokens
      : null
  const remainingWalletBnb =
    remainingWalletTokens === null || gate.presalePrice <= 0n
      ? null
      : ceilDivide(remainingWalletTokens * gate.presalePrice, TOKEN_SCALE)
  const walletLimitBnb =
    gate.maxBuyPerWallet <= 0n || gate.presalePrice <= 0n
      ? null
      : ceilDivide(gate.maxBuyPerWallet * gate.presalePrice, TOKEN_SCALE)
  const remainingHardCap =
    gate.hardCap > 0n
      ? gate.bnbAccumulated >= gate.hardCap
        ? 0n
        : gate.hardCap - gate.bnbAccumulated
      : null
  const maxContribution = minimum([
    walletBalance,
    remainingWalletBnb,
    remainingHardCap,
  ])
  const estimatedTokens =
    parsedAmount && parsedAmount > 0n && gate.presalePrice > 0n
      ? (parsedAmount * TOKEN_SCALE) / gate.presalePrice
      : 0n
  const exceedsWalletTokenLimit =
    parsedAmount !== null &&
    parsedAmount > 0n &&
    remainingWalletTokens !== null &&
    estimatedTokens > remainingWalletTokens
  const exceedsHardCap =
    parsedAmount !== null &&
    parsedAmount > 0n &&
    remainingHardCap !== null &&
    parsedAmount > remainingHardCap
  const exceedsWalletBalance =
    parsedAmount !== null &&
    parsedAmount > 0n &&
    walletBalance !== null &&
    parsedAmount > walletBalance
  const isAmountOverLimit = exceedsWalletTokenLimit || exceedsHardCap
  const amountError =
    parsedAmount === null
      ? m.token_invalid_amount()
      : parsedAmount > 0n && gate.presalePrice <= 0n
        ? m.token_presale_price_unavailable()
        : exceedsWalletTokenLimit
          ? m.token_wallet_limit_exceeded({
              amount: formatBnbAmount(remainingWalletBnb ?? 0n),
            })
          : exceedsHardCap
            ? m.token_presale_capacity_exceeded({
                amount: formatBnbAmount(remainingHardCap ?? 0n),
              })
            : exceedsWalletBalance
              ? m.token_insufficient_balance_description()
              : null

  const refreshPresale = async () => {
    await Promise.all([
      gate.refetch(),
      userPosition.refetch(),
      queryClient.invalidateQueries({ queryKey: ['readContracts'] }),
    ])
  }

  const transact = async (
    action: 'subscribe' | 'refund' | 'settle',
    value?: bigint,
  ) => {
    if (!gate.presaleAddress || !publicClient) return
    setPendingAction(action)

    try {
      const hash =
        action === 'subscribe'
          ? await contractWriter.mutateAsync({
              address: gate.presaleAddress,
              abi: presaleAbi,
              functionName: 'subscribe',
              chainId: PLATFORM_CHAIN_ID,
              value: value ?? 0n,
            })
          : action === 'refund'
            ? await contractWriter.mutateAsync({
                address: gate.presaleAddress,
                abi: presaleAbi,
                functionName: 'refund',
                chainId: PLATFORM_CHAIN_ID,
              })
            : await contractWriter.mutateAsync({
                address: gate.presaleAddress,
                abi: presaleAbi,
                functionName: 'endPresale',
                chainId: PLATFORM_CHAIN_ID,
              })
      await publicClient.waitForTransactionReceipt({ hash })
      await refreshPresale()
      if (action === 'subscribe') setSubscribeAmount('')
      toast.success(
        m.token_transaction_confirmed(),
        action === 'subscribe'
          ? m.token_subscribe_success()
          : action === 'refund'
            ? m.token_refund_success()
            : m.token_settle_success(),
      )
    } catch (error) {
      toast.error(
        m.token_transaction_failed(),
        getContractErrorMessage(error),
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleSubscribe = async () => {
    if (!isPresaleActive || parsedAmount === null || parsedAmount <= 0n) {
      toast.error(
        m.token_invalid_amount(),
        m.token_invalid_amount_description(),
      )
      return
    }
    if (gate.presalePrice <= 0n) {
      toast.error(
        m.token_presale_unavailable_title(),
        m.token_presale_price_unavailable(),
      )
      return
    }
    if (walletBalance !== null && parsedAmount > walletBalance) {
      toast.error(
        m.token_insufficient_balance(),
        m.token_insufficient_balance_description(),
      )
      return
    }
    if (isAmountOverLimit) {
      toast.error(
        m.token_amount_over_limit(),
        m.token_amount_over_limit_description(),
      )
      return
    }
    await transact('subscribe', parsedAmount)
  }

  if (gate.isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-[#A0A3A7]">
        <Loader2 className="size-4 animate-spin text-[#FFA546]" />
        {m.token_presale_loading()}
      </div>
    )
  }

  if (!gate.tokenExists) {
    return (
      <StatusMessage
        title={m.token_not_issued_title()}
        description={m.token_not_issued_description()}
      />
    )
  }

  if (!gate.presaleConfigured || !gate.presaleAddress || !gate.presaleEnabled) {
    return (
      <StatusMessage
        title={m.token_presale_unavailable_title()}
        description={m.token_presale_unavailable_description()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-foreground/10 bg-foreground/3 px-3">
        <PresaleRow
          label={m.token_presale_allocation()}
          value={
            gate.presaleShare > 0n
              ? `${formatTokenAmount(gate.presaleShare, gate.tokenDecimals)} ${symbol}`
              : '--'
          }
        />
        <PresaleRow
          label={m.token_presale_price()}
          value={
            gate.presalePrice > 0n ? formatBnbAmount(gate.presalePrice) : '--'
          }
        />
        <PresaleRow
          label={m.token_wallet_limit()}
          value={
            walletLimitBnb !== null ? formatBnbAmount(walletLimitBnb) : '--'
          }
        />
        <PresaleRow
          label={m.token_soft_cap()}
          value={gate.softCap > 0n ? formatBnbAmount(gate.softCap) : '--'}
        />
        <PresaleRow
          label={m.token_hard_cap()}
          value={
            gate.hardCap > 0n
              ? formatBnbAmount(gate.hardCap)
              : m.token_no_hard_cap()
          }
        />
        <PresaleRow
          label={m.token_unlock_rule()}
          value={
            gate.vestingRate > 0n
              ? m.token_unlock_value({
                  duration: formatDuration(gate.vestingDelay),
                  rate: gate.vestingRate.toString(),
                })
              : '--'
          }
        />
      </section>

      {gate.presaleStatus === 1 && (
        <>
          <section className="flex flex-col gap-3 border border-foreground/10 bg-foreground/3 p-3">
            <PresaleProgress
              label={m.token_token_progress()}
              value={getPresaleProgress(
                gate.tokensSubscribed,
                gate.presaleShare,
              )}
              detail={`${formatTokenAmount(gate.tokensSubscribed, gate.tokenDecimals)} / ${formatTokenAmount(gate.presaleShare, gate.tokenDecimals)} ${symbol}`}
              showPercentage
            />
            <PresaleProgress
              label={m.token_soft_cap_progress()}
              value={getPresaleProgress(gate.bnbAccumulated, gate.softCap)}
              detail={
                gate.softCap > 0n
                  ? `${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.softCap)}`
                  : '--'
              }
              highlight={gate.isSoftCapReached}
              showPercentage
            />
            {gate.hardCap > 0n && (
              <PresaleProgress
                label={m.token_hard_cap_progress()}
                value={getPresaleProgress(gate.bnbAccumulated, gate.hardCap)}
                detail={`${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.hardCap)}`}
                showPercentage
              />
            )}
          </section>

          {hasEnded ? (
            <section className="flex flex-col gap-3 border border-amber-400/30 bg-amber-400/10 p-3">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <div className="flex flex-col gap-1 text-xs">
                  <strong className="text-amber-200">
                    {m.token_presale_ended_title()}
                  </strong>
                  <span className="leading-5 text-[#A0A3A7]">
                    {gate.isSoftCapReached
                      ? m.token_presale_ended_success_description()
                      : m.token_presale_ended_failed_description()}
                  </span>
                </div>
              </div>
              <Web3ActionButton
                onAction={() => transact('settle')}
                loading={pendingAction === 'settle'}
                loadingText={m.token_settling()}
                className="h-10 w-full bg-[#FFA546] text-sm font-semibold text-black hover:bg-[#ffb866]"
              >
                {m.token_settle_presale()}
              </Web3ActionButton>
            </section>
          ) : hasNotStarted ? (
            <StatusMessage
              title={m.token_presale_not_started_title()}
              description={m.token_starts_in({
                time: formatCountdown(countdownSeconds),
              })}
            />
          ) : (
            <section className="flex flex-col gap-3 border border-foreground/10 bg-foreground/3 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A0A3A7]">
                  {m.token_ends_in({ time: '' }).replace(/\s*$/, '')}
                </span>
                <strong className="font-mono text-[#FFA546]">
                  {formatCountdown(countdownSeconds)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A0A3A7]">
                  {m
                    .token_wallet_balance({ amount: '' })
                    .replace(/：?\s*$/, '')}
                </span>
                <span className="font-mono text-foreground">
                  {walletBalance === null
                    ? '--'
                    : formatBnbAmount(walletBalance)}
                </span>
              </div>
              <div className="flex h-11 items-center border border-foreground/15 bg-background px-3 focus-within:border-primary">
                <input
                  type="text"
                  inputMode="decimal"
                  value={subscribeAmount}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setSubscribeAmount(value)
                    }
                  }}
                  placeholder={m.token_amount_placeholder()}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-[#84888C]"
                />
                <span className="ml-2 text-xs font-semibold text-[#FFA546]">
                  BNB
                </span>
              </div>
              {amountError && (
                <span className="text-xs text-red-400">{amountError}</span>
              )}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => {
                      if (!maxContribution || maxContribution <= 0n) return
                      setSubscribeAmount(
                        formatEther((maxContribution * BigInt(percent)) / 100n),
                      )
                    }}
                    disabled={!maxContribution || maxContribution <= 0n}
                    className="h-8 border border-foreground/10 bg-foreground/5 text-xs text-[#A0A3A7] transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A0A3A7]">
                  {m.token_estimated_tokens()}
                </span>
                <span className="font-mono text-foreground">
                  {formatTokenAmount(estimatedTokens, gate.tokenDecimals)}{' '}
                  {symbol}
                </span>
              </div>
              <Web3ActionButton
                onAction={handleSubscribe}
                loading={pendingAction === 'subscribe'}
                loadingText={m.token_subscribing()}
                disabled={
                  !isPresaleActive ||
                  parsedAmount === null ||
                  parsedAmount <= 0n ||
                  amountError !== null
                }
                className="h-11 w-full bg-[#FFA546] text-sm font-semibold text-black hover:bg-[#ffb866]"
              >
                {m.token_join_presale()}
              </Web3ActionButton>
            </section>
          )}
        </>
      )}

      {gate.presaleStatus === 2 && (
        <StatusMessage
          title={m.token_waiting_launch_title()}
          description={m.token_waiting_launch_description()}
        />
      )}
      {gate.presaleStatus === 3 && (
        <StatusMessage
          title={m.token_presale_complete_title()}
          description={m.token_presale_complete_description()}
        />
      )}
      {gate.presaleStatus === 4 && (
        <section className="flex flex-col gap-3 border border-red-400/30 bg-red-400/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" />
            <div className="flex flex-col gap-1 text-xs">
              <strong className="text-red-200">{m.token_refund_title()}</strong>
              <span className="leading-5 text-[#A0A3A7]">
                {m.token_refund_description()}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#A0A3A7]">
              {m.token_refundable_amount()}
            </span>
            <span className="font-mono text-foreground">
              {formatBnbAmount(userContribution)}
            </span>
          </div>
          <Web3ActionButton
            onAction={() => transact('refund')}
            loading={pendingAction === 'refund'}
            loadingText={m.token_refunding()}
            disabled={Boolean(userAddress) && userContribution <= 0n}
            className="h-10 w-full bg-red-400 text-sm font-semibold text-black hover:bg-red-300"
          >
            {userContribution > 0n
              ? m.token_request_refund()
              : m.token_nothing_to_refund()}
          </Web3ActionButton>
        </section>
      )}
    </div>
  )
}
