import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckIcon,
  CircleStopIcon,
  CoinsIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PercentIcon,
  PencilIcon,
  RocketIcon,
  SendIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  WalletIcon,
} from 'lucide-react'
import { getAddress, isAddress, type Address, type Hex } from 'viem'
import {
  useConfig,
  useConnection,
  usePublicClient,
  useWriteContract,
} from 'wagmi'
import { presaleAbi } from '@sillyfunc/launchpad-contracts'

import type { BoardItemResponse } from '@/api/board'
import { parseTxHash } from '@/api/token'
import { PresaleProgress } from '@/components/common/presale-progress'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { boardKeys } from '@/hooks/use-board'
import { useCreateToken } from '@/hooks/use-create-token'
import { useTokenGate } from '@/hooks/use-token-gate'
import { requestAuthSignature } from '@/lib/auth'
import { getContractErrorMessage } from '@/lib/contract-error'
import { formatBnbAmount, formatDecimal, formatTokenAmount } from '@/lib/format'
import { isPredictedTokenAddress } from '@/lib/vanity-salt'
import { PLATFORM_CHAIN_ID, getExplorerAddressUrl } from '@/lib/web3'
import { formatAddress, getPresaleProgress } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
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
import { toast } from '@/lib/toast'

interface TokenCardProps {
  token: BoardItemResponse
  onEdit: (token: BoardItemResponse) => void
  onPresale: (
    token: BoardItemResponse,
    tokenAddress: Address,
    options?: { allowEditAfterRelaunch?: boolean },
  ) => void
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
  const candidates = [token.coinContractAddress, token.contractAddress]

  const address = candidates.find((candidate) => isAddress(candidate))
  return address ? getAddress(address) : undefined
}

function getReservedAddress(
  token: BoardItemResponse,
  issuedTokenAddress?: Address,
): Address | undefined {
  if (
    issuedTokenAddress ||
    !isPredictedTokenAddress(token.salt, token.coinContractAddress)
  ) {
    return undefined
  }

  return getAddress(token.coinContractAddress)
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
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-neutral-400">
        <Icon className="size-3.5 shrink-0 text-[#FE810B]" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <div
        className={`shrink-0 text-right font-semibold text-white ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

export function TokenCard({
  token,
  onEdit,
  onPresale,
  onView,
}: TokenCardProps) {
  const [copiedAddress, setCopiedAddress] = useState<Address>()
  const [issuedAddress, setIssuedAddress] = useState<Address>()
  const [isIssuing, setIsIssuing] = useState(false)
  const config = useConfig()
  const { address: connectedAddress } = useConnection()
  const queryClient = useQueryClient()
  const { createToken } = useCreateToken()
  const tokenAddressCandidate = issuedAddress ?? getTokenAddress(token)
  const gate = useTokenGate(tokenAddressCandidate, token.presaleAddress)
  const tokenAddress =
    issuedAddress ?? (gate.tokenExists ? tokenAddressCandidate : undefined)
  const reservedAddress = getReservedAddress(token, tokenAddress)
  const stage = getStage(gate)
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
  const presaleProgress = getPresaleProgress(
    gate.tokensSubscribed,
    gate.presaleShare,
  )
  const softCapProgress = getPresaleProgress(gate.bnbAccumulated, gate.softCap)
  const hardCapProgress = getPresaleProgress(gate.bnbAccumulated, gate.hardCap)

  const handleCopy = async (address: Address) => {
    if (!navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      window.setTimeout(() => setCopiedAddress(undefined), 2_000)
    } catch {
      setCopiedAddress(undefined)
    }
  }

  const hasConfiguredPresale =
    gate.presaleConfigured || gate.presaleEnabled
  const isSetupAction = stage === 'prelaunch' && !hasConfiguredPresale
  const isOpenPresaleAction =
    stage === 'prelaunch' &&
    hasConfiguredPresale &&
    Boolean(gate.presaleAddress)
  const isSecondaryAction = stage === 'presale'

  const handleIssueToken = async () => {
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
        meta:
          token.meta || token.zhIntroduction || token.enIntroduction || '',
        buyTax: token.buyTax ?? 0,
        sellTax: token.sellTax ?? 0,
        feeRecipient: token.feeRecipient,
        taxDurationDays: Number(token.taxDuration) || 30,
        antiFarmerDurationDays: Number(token.antiFarmerDuration) || 0,
        salt,
      })

      setIssuedAddress(result.tokenAddress)
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

  const handlePrimaryAction = () => {
    if (isSetupAction && tokenAddress) {
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
                <CoinsIcon
                  className="size-6 text-[#FFA546]"
                  aria-hidden="true"
                />
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
                    address: tokenAddress
                      ? formatAddress(tokenAddress)
                      : m.dashboard_token_not_issued(),
                  })}
                </span>
                {tokenAddress && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={m.dashboard_copy_address()}
                      onClick={() => void handleCopy(tokenAddress)}
                      className="text-neutral-400 hover:text-white"
                    >
                      {copiedAddress === tokenAddress ? (
                        <CheckIcon
                          className="text-green-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <CopyIcon aria-hidden="true" />
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
              value={
                tokenAddress ? totalSupply : m.dashboard_token_not_issued()
              }
            />
            <DetailRow
              icon={WalletIcon}
              label={m.dashboard_fee_recipient()}
              value={formatAddress(token.feeRecipient)}
              mono
            />
            {reservedAddress && (
              <DetailRow
                icon={WalletIcon}
                label={m.dashboard_reserved_ca()}
                value={
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-mono" title={reservedAddress}>
                      {formatAddress(reservedAddress)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={m.dashboard_copy_reserved_ca()}
                      onClick={() => void handleCopy(reservedAddress)}
                      className="text-neutral-400 hover:text-white"
                    >
                      {copiedAddress === reservedAddress ? (
                        <CheckIcon
                          className="text-green-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <CopyIcon aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                }
              />
            )}
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
                <PresaleProgress
                  label={m.dashboard_token_progress()}
                  value={presaleProgress}
                  detail={`${formatTokenAmount(gate.tokensSubscribed, gate.tokenDecimals)} / ${formatTokenAmount(gate.presaleShare, gate.tokenDecimals)} ${tokenSymbol}`}
                  showMarker
                  showDivider
                />
              )}
              {gate.softCap > 0n && (
                <PresaleProgress
                  label={m.dashboard_soft_cap_progress()}
                  value={softCapProgress}
                  detail={`${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.softCap)}`}
                  showMarker
                  showDivider
                />
              )}
              {gate.hardCap > 0n && (
                <PresaleProgress
                  label={m.dashboard_hard_cap_progress()}
                  value={hardCapProgress}
                  detail={`${formatBnbAmount(gate.bnbAccumulated)} / ${formatBnbAmount(gate.hardCap)}`}
                  showMarker
                  showDivider
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
        {stage === 'notIssued' && (
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
              onAction={handleIssueToken}
              loading={isIssuing}
              loadingText={m.dashboard_issuing_token()}
              className="border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5 disabled:opacity-50"
            >
              <RocketIcon aria-hidden="true" />
              <span>{m.dashboard_issue_token()}</span>
            </Web3ActionButton>
          </>
        )}
        {stage === 'presale' && (
          <EndPresaleButton
            presaleAddress={gate.presaleAddress}
            onSettled={gate.refetch}
          />
        )}
        {stage === 'failed' && (
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
        {isOpenPresaleAction && gate.presaleAddress && (
          <OpenPresaleButton presaleAddress={gate.presaleAddress} />
        )}
        {stage !== 'failed' &&
          stage !== 'notIssued' &&
          !isOpenPresaleAction && (
            <Button
              type="button"
              variant={isSecondaryAction ? 'outline' : 'default'}
              onClick={handlePrimaryAction}
              disabled={stage === 'syncing' || !tokenAddress}
              className={
                isSecondaryAction
                  ? 'border-[#484b51] bg-[#131516] font-bold text-white hover:bg-white/10'
                  : 'border-transparent bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] font-bold text-white transition-transform active:translate-y-0.5'
              }
            >
              <RocketIcon aria-hidden="true" />
              <span>
                {isSetupAction
                  ? m.dashboard_setup_presale()
                  : m.dashboard_view_token()}
              </span>
            </Button>
          )}
        {stage === 'live' && gate.tokensClaimed && (
          <p className="text-center text-xs text-green-300">
            {m.dashboard_token_claimed()}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}

function getStage(gate: ReturnType<typeof useTokenGate>): TokenStage {
  if (!gate.tokenAddress) return 'notIssued'
  // Background refetch must not flip the badge or hide actions.
  if (gate.isLoading) return 'syncing'
  if (!gate.tokenExists) return 'notIssued'

  const claimed = gate.tokensClaimed || (gate.tokenState ?? 0) >= 2
  if (claimed) return 'live'
  if (gate.presaleStatus === 4) return 'failed'
  if (gate.presaleStatus === 2) return 'waitingLaunch'
  if (gate.presaleStatus === 1) return 'presale'
  if (
    (gate.presaleConfigured || gate.presaleEnabled) &&
    gate.presaleStatus === undefined
  ) {
    return 'syncing'
  }
  return 'prelaunch'
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
  const publicClient = usePublicClient()
  const { mutateAsync: writeContract } = useWriteContract()
  const queryClient = useQueryClient()
  const [isRelaunching, setIsRelaunching] = useState(false)

  const handleRelaunchPresale = async () => {
    if (!publicClient || disabled || isRelaunching) return

    setIsRelaunching(true)
    try {
      const hash = await writeContract({
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'relaunchPresale',
        chainId: PLATFORM_CHAIN_ID,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      await queryClient
        .invalidateQueries({ queryKey: ['readContracts'] })
        .catch(() => undefined)
      toast.success(
        m.token_transaction_confirmed(),
        m.dashboard_relaunch_presale_success(),
      )
      onRelaunched()
    } catch (error) {
      toast.error(
        m.token_transaction_failed(),
        getContractErrorMessage(error),
      )
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
  const publicClient = usePublicClient()
  const { mutateAsync: writeContract } = useWriteContract()
  const queryClient = useQueryClient()
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenPresale = async () => {
    if (!publicClient || isOpening) return

    setIsOpening(true)
    try {
      const hash = await writeContract({
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'openPresale',
        chainId: PLATFORM_CHAIN_ID,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      await queryClient
        .invalidateQueries({ queryKey: ['readContracts'] })
        .catch(() => undefined)
      toast.success(
        m.token_transaction_confirmed(),
        m.dashboard_open_presale_success(),
      )
    } catch (error) {
      toast.error(
        m.token_transaction_failed(),
        getContractErrorMessage(error),
      )
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
  const publicClient = usePublicClient()
  const { mutateAsync: writeContract } = useWriteContract()
  const queryClient = useQueryClient()
  const [isEnding, setIsEnding] = useState(false)

  const handleEndPresale = async () => {
    if (!presaleAddress || !publicClient || isEnding) return

    setIsEnding(true)
    try {
      const hash = await writeContract({
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'endPresale',
        chainId: PLATFORM_CHAIN_ID,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      await Promise.all([
        onSettled(),
        queryClient.invalidateQueries({ queryKey: ['readContracts'] }),
      ])
      toast.success(
        m.token_transaction_confirmed(),
        m.dashboard_end_presale_success(),
      )
    } catch (error) {
      toast.error(
        m.token_transaction_failed(),
        getContractErrorMessage(error),
      )
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
