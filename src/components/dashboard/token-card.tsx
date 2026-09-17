import { useState } from 'react'
import {
  CheckIcon,
  CoinsIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PercentIcon,
  RocketIcon,
  SendIcon,
  ShieldCheckIcon,
  WalletIcon,
} from 'lucide-react'
import { isAddress, type Address } from 'viem'

import type { BoardItemResponse } from '@/api/board'
import { useTokenGate } from '@/hooks/use-token-gate'
import {
  formatBnbAmount,
  formatDecimal,
  formatTokenAmount,
} from '@/lib/format'
import { getExplorerAddressUrl } from '@/lib/web3'
import { formatAddress } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface TokenCardProps {
  token: BoardItemResponse
  onEdit: (token: BoardItemResponse) => void
  onPresale: (token: BoardItemResponse, tokenAddress: Address) => void
  onView: (tokenAddress: Address) => void
}

type TokenStage =
  | 'notIssued'
  | 'syncing'
  | 'prelaunch'
  | 'presale'
  | 'waitingLaunch'
  | 'live'
  | 'failed'

const stageStyles: Record<
  TokenStage,
  { label: () => string; className: string }
> = {
  notIssued: {
    label: () => m.dashboard_token_not_issued(),
    className: 'border-neutral-600 text-neutral-300',
  },
  syncing: {
    label: () => m.dashboard_token_syncing(),
    className: 'border-sky-500/40 text-sky-300',
  },
  prelaunch: {
    label: () => m.dashboard_token_prelaunch(),
    className: 'border-amber-500/40 text-amber-300',
  },
  presale: {
    label: () => m.dashboard_token_presale(),
    className: 'border-emerald-500/40 text-emerald-300',
  },
  waitingLaunch: {
    label: () => m.dashboard_token_waiting_launch(),
    className: 'border-violet-500/40 text-violet-300',
  },
  live: {
    label: () => m.dashboard_token_live(),
    className: 'border-green-500/40 text-green-300',
  },
  failed: {
    label: () => m.dashboard_token_failed(),
    className: 'border-rose-500/40 text-rose-300',
  },
}

function getTokenAddress(token: BoardItemResponse): Address | undefined {
  const candidates = [
    token.coinContractAddress,
    token.contractAddress,
    token.address,
  ]

  const address = candidates.find((candidate) => isAddress(candidate))
  return address as Address | undefined
}

function getProgress(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n) return 0
  const percentage = Number((numerator * 10_000n) / denominator) / 100
  return Math.min(100, Math.max(0, percentage))
}

function formatDays(value: number | undefined) {
  return value === undefined || value === null || value <= 0
    ? '--'
    : `${formatDecimal(value, { maximumFractionDigits: 2 })}d`
}

function formatTax(value: number | undefined, fallback?: number) {
  const resolved = value ?? fallback
  return resolved === undefined ? '--' : `${formatDecimal(resolved)}%`
}

function formatNumberValue(value: number | undefined) {
  return value === undefined || value === null ? '--' : formatDecimal(value)
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof CoinsIcon
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-neutral-400">
        <Icon className="size-3.5 shrink-0 text-[#FE810B]" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={`shrink-0 text-right font-semibold text-white ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

function ProgressRow({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail: string
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-neutral-400">
          <span className="size-1.5 shrink-0 bg-[#FFA546]" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-mono text-neutral-300">{detail}</span>
      </div>
      <Progress value={value} />
    </div>
  )
}

export function TokenCard({ token, onEdit, onPresale, onView }: TokenCardProps) {
  const [copied, setCopied] = useState(false)
  const tokenAddress = getTokenAddress(token)
  const gate = useTokenGate(tokenAddress, token.presaleAddress)
  const stage = getStage(token, gate)
  const stageStyle = stageStyles[stage]

  const tokenName = gate.tokenName || token.name || '--'
  const tokenSymbol = gate.tokenSymbol || token.symbol || '--'
  const description = token.meta || token.zhIntroduction || token.enIntroduction
  const totalSupply =
    gate.totalSupply > 0n
      ? formatTokenAmount(gate.totalSupply, gate.tokenDecimals)
      : formatNumberValue(token.totalSupply)
  const buyTax =
    token.buyTax || token.buyTax === 0
      ? token.buyTax
      : gate.buyTaxBps === undefined
        ? undefined
        : gate.buyTaxBps / 100
  const sellTax =
    token.sellTax || token.sellTax === 0
      ? token.sellTax
      : gate.sellTaxBps === undefined
        ? undefined
        : gate.sellTaxBps / 100

  const presalePrice =
    gate.presalePrice > 0n
      ? formatBnbAmount(gate.presalePrice)
      : token.presaleTokenPrice > 0
        ? `${formatDecimal(token.presaleTokenPrice)} BNB`
        : '--'
  const walletLimit =
    gate.maxBuyPerWallet > 0n
      ? formatBnbAmount(gate.maxBuyPerWallet)
      : token.maxBuyPerWallet > 0
        ? `${formatDecimal(token.maxBuyPerWallet)} BNB`
        : '--'
  const raised =
    gate.presaleAddress && gate.bnbAccumulated > 0n
      ? formatBnbAmount(gate.bnbAccumulated)
      : '--'
  const tokenAllocation =
    gate.presaleShare > 0n
      ? `${formatTokenAmount(gate.presaleShare, gate.tokenDecimals)} ${tokenSymbol}`
      : token.tokenAmount > 0
        ? `${formatDecimal(token.tokenAmount)} ${tokenSymbol}`
        : '--'
  const shouldShowPresale =
    Boolean(tokenAddress) && (gate.presaleConfigured || gate.presaleEnabled)
  const presaleProgress = getProgress(gate.tokensSubscribed, gate.presaleShare)
  const softCapProgress = getProgress(gate.bnbAccumulated, gate.softCap)
  const hardCapProgress = getProgress(gate.bnbAccumulated, gate.hardCap)

  const handleCopy = async () => {
    if (!tokenAddress || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(tokenAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2_000)
    } catch {
      setCopied(false)
    }
  }

  const handlePrimaryAction = () => {
    if (stage === 'notIssued') {
      onEdit(token)
      return
    }

    if (stage === 'prelaunch' && tokenAddress) {
      onPresale(token, tokenAddress)
      return
    }

    if (tokenAddress) onView(tokenAddress)
  }

  return (
    <Card className="flex h-full flex-col justify-between overflow-hidden border border-[#484b51] bg-[#131516] p-0 text-white shadow-lg transition-all hover:border-[#FE810B]/60">
      <div>
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-[#2F3737] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden border border-[#484b51] bg-[#1a1c1e]">
              {token.coinImg ? (
                <img
                  src={token.coinImg}
                  alt={tokenName}
                  className="size-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <CoinsIcon className="size-6 text-[#FFA546]" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <CardTitle className="truncate text-base font-bold text-white">
                  {tokenName}
                </CardTitle>
                <span className="shrink-0 bg-[#FE810B]/15 px-2 py-0.5 text-xs font-semibold text-[#FFA546]">
                  ${tokenSymbol}
                </span>
              </div>
              <CardDescription className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                <span className="truncate">
                  {m.dashboard_ca({
                    address: tokenAddress ? formatAddress(tokenAddress) : m.dashboard_token_not_issued(),
                  })}
                </span>
                {tokenAddress && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={m.dashboard_copy_address()}
                      onClick={() => void handleCopy()}
                      className="text-neutral-400 hover:text-white"
                    >
                      {copied ? (
                        <CheckIcon className="size-3 text-green-400" aria-hidden="true" />
                      ) : (
                        <CopyIcon className="size-3" aria-hidden="true" />
                      )}
                    </Button>
                    <a
                      href={getExplorerAddressUrl(tokenAddress)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={m.dashboard_view_on_explorer()}
                      className="inline-flex size-6 items-center justify-center text-neutral-400 transition-colors hover:text-[#FFA546]"
                    >
                      <ExternalLinkIcon className="size-3" aria-hidden="true" />
                    </a>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 px-2 py-0.5 ${stageStyle.className}`}
          >
            {stageStyle.label()}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3 p-4">
          <p className="line-clamp-2 min-h-8 text-xs text-neutral-400">
            {description || m.dashboard_no_description()}
          </p>

          <div className="flex flex-col divide-y divide-[#2F3737]/60 border border-[#2F3737] bg-[#17191b] px-3 py-1 text-xs">
            <DetailRow
              icon={PercentIcon}
              label={m.dashboard_buy_sell_tax()}
              value={`${formatTax(buyTax)} / ${formatTax(sellTax)}`}
            />
            <DetailRow
              icon={PercentIcon}
              label={m.dashboard_tax_duration()}
              value={formatDays(token.taxDuration)}
            />
            <DetailRow
              icon={ShieldCheckIcon}
              label={m.dashboard_anti_farmer()}
              value={formatDays(token.antiFarmerDuration)}
            />
            <DetailRow
              icon={CoinsIcon}
              label={m.dashboard_total_supply()}
              value={tokenAddress ? totalSupply : m.dashboard_token_not_issued()}
            />
            <DetailRow
              icon={WalletIcon}
              label={m.dashboard_fee_recipient()}
              value={formatAddress(token.feeRecipient)}
              mono
            />
          </div>

          {shouldShowPresale && (
            <div className="flex flex-col gap-3 border border-[#2F3737] bg-[#17191b] p-3 text-xs">
              <div className="flex flex-col divide-y divide-white/5 border-b border-white/5 pb-1">
                <DetailRow
                  icon={RocketIcon}
                  label={m.dashboard_presale_price()}
                  value={presalePrice}
                  mono
                />
                <DetailRow
                  icon={WalletIcon}
                  label={m.dashboard_wallet_limit()}
                  value={walletLimit}
                  mono
                />
                <DetailRow
                  icon={CoinsIcon}
                  label={m.dashboard_raised()}
                  value={raised}
                  mono
                />
                <DetailRow
                  icon={CoinsIcon}
                  label={m.dashboard_presale_allocation()}
                  value={tokenAllocation}
                  mono
                />
              </div>

              {gate.presaleShare > 0n && (
                <ProgressRow
                  label={m.dashboard_token_progress()}
                  value={presaleProgress}
                  detail={`${formatTokenAmount(gate.tokensSubscribed, gate.tokenDecimals)} / ${formatTokenAmount(gate.presaleShare, gate.tokenDecimals)} ${tokenSymbol}`}
                />
              )}
              {gate.softCap > 0n && (
                <ProgressRow
                  label={m.dashboard_soft_cap_progress()}
                  value={softCapProgress}
                  detail={`${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.softCap)}`}
                />
              )}
              {gate.hardCap > 0n && (
                <ProgressRow
                  label={m.dashboard_hard_cap_progress()}
                  value={hardCapProgress}
                  detail={`${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.hardCap)}`}
                />
              )}
            </div>
          )}

          {(token.website || token.twitter || token.telegram) && (
            <div className="flex items-center gap-3 pt-1 text-xs text-neutral-400">
              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={m.dashboard_open_website()}
                  className="flex items-center gap-1 transition-colors hover:text-[#FFA546]"
                >
                  <GlobeIcon className="size-3.5" aria-hidden="true" />
                  <span>Web</span>
                </a>
              )}
              {token.twitter && (
                <a
                  href={token.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 transition-colors hover:text-[#FFA546]"
                >
                  <SendIcon className="size-3.5" aria-hidden="true" />
                  <span>Twitter</span>
                </a>
              )}
              {token.telegram && (
                <a
                  href={token.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 transition-colors hover:text-[#FFA546]"
                >
                  <SendIcon className="size-3.5" aria-hidden="true" />
                  <span>Telegram</span>
                </a>
              )}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="flex w-full flex-col items-stretch gap-2 border-t border-[#2F3737] bg-[#16181a] p-3">
        <Button
          type="button"
          onClick={handlePrimaryAction}
          disabled={stage === 'syncing' || (stage !== 'notIssued' && !tokenAddress)}
          className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5"
        >
          <RocketIcon aria-hidden="true" />
          <span>
            {stage === 'notIssued'
              ? m.dashboard_edit_token()
              : stage === 'prelaunch'
                ? m.dashboard_setup_presale()
                : m.dashboard_view_token()}
          </span>
        </Button>
        {stage === 'live' && gate.tokensClaimed && (
          <p className="text-center text-xs text-green-300">
            {m.dashboard_token_claimed()}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}

function getStage(
  token: BoardItemResponse,
  gate: ReturnType<typeof useTokenGate>,
): TokenStage {
  if (!getTokenAddress(token) || (!gate.tokenExists && !gate.isError)) {
    return gate.isLoading || gate.isFetching ? 'syncing' : 'notIssued'
  }
  if (gate.isLoading || gate.isFetching) return 'syncing'
  if (gate.presaleStatus === 4) return 'failed'
  if (gate.presaleStatus === 3 || (gate.tokenState ?? 0) >= 2) return 'live'
  if (gate.presaleStatus === 2) return 'waitingLaunch'
  if (gate.presaleStatus === 1 && gate.presaleEnabled) return 'presale'
  return 'prelaunch'
}
