import { useId, useState, type ReactNode } from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  CoinsIcon,
  CopyIcon,
  ExternalLinkIcon,
  FlameIcon,
  GlobeIcon,
  PercentIcon,
  RepeatIcon,
  SendIcon,
  ShieldCheckIcon,
  WalletIcon,
} from 'lucide-react'
import { formatEther, type Address } from 'viem'

import type { BoardItemResponse } from '@/api/board'
import type { BuybackVaultStats } from '@/hooks/use-buyback-vault-stats'
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
import { formatBnbAmount, formatDecimal, formatTokenAmount } from '@/lib/format'
import { formatAddress } from '@/lib/utils'
import { getExplorerAddressUrl } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'
import {
  formatDays,
  formatTax,
  stageStyles,
  type TokenCardState,
  type TokenStage,
} from './token-card-model'

export interface TokenCardShellProps {
  token: BoardItemResponse
  tokenName: string
  tokenSymbol: string
  stage: TokenStage
  tokenAddress?: Address
  vaultStats?: BuybackVaultStats | null
  vaultStatsLoading?: boolean
  details: ReactNode
  presaleDetails?: ReactNode
  footer: ReactNode
}

/** Shared card chrome: header, description, detail rows and footer container. */
export const TokenCardShell: React.FC<TokenCardShellProps> = ({
  token,
  tokenName,
  tokenSymbol,
  stage,
  tokenAddress,
  vaultStats,
  vaultStatsLoading = false,
  details,
  presaleDetails,
  footer,
}) => {
  const [copiedAddress, setCopiedAddress] = useState<Address>()
  const stageStyle = stageStyles[stage]

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
            {token.meta ||
              token.zhIntroduction ||
              token.enIntroduction ||
              m.dashboard_no_description()}
          </p>

          {details}

          {presaleDetails}

          <VaultConfigDetails token={token} />
          <VaultRuntimeDetails
            token={token}
            symbol={tokenSymbol}
            stats={vaultStats}
            loading={vaultStatsLoading}
          />

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
        {footer}
      </CardFooter>
    </Card>
  )
}

export interface DetailRowProps {
  icon: typeof CoinsIcon
  label: string
  value: ReactNode
  mono?: boolean
}

export const DetailRow: React.FC<DetailRowProps> = ({
  icon: Icon,
  label,
  value,
  mono = false,
}) => {
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

export interface TokenBasicDetailsProps {
  state: TokenCardState
}

/** Detail rows every token has, regardless of how it is launched. */
export const TokenBasicDetails: React.FC<TokenBasicDetailsProps> = ({
  state,
}) => {
  const { token, tokenAddress, buyTax, sellTax, totalSupply } = state

  return (
    <>
    <DetailSection title={m.dashboard_basic_info()}>
      <DetailRow
        icon={PercentIcon}
        label={m.dashboard_buy_sell_tax()}
        value={`${formatTax(buyTax)} / ${formatTax(sellTax)}`}
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
    </DetailSection>
    <TaxAllocationDetails
      token={token}
      symbol={state.tokenSymbol}
      taxYield={state.taxYield}
      taxYieldLoading={state.taxYieldLoading}
    />
    </>
  )
}

export function DetailSection({
  title,
  children,
  divided = true,
  collapsible = false,
}: {
  title: string
  children: ReactNode
  divided?: boolean
  /** Adds a title-bar toggle. Collapsible sections start collapsed. */
  collapsible?: boolean
}) {
  const [isOpen, setIsOpen] = useState(!collapsible)
  const contentId = useId()

  return (
    <section className="border border-[#2F3737] bg-[#17191b]">
      <h3 className="border-b border-[#2F3737]/60 px-3 py-2 text-11 font-semibold tracking-wide text-[#FFA546]">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={() => setIsOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 text-left"
          >
            <span>{title}</span>
            <ChevronDownIcon
              className={`size-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          title
        )}
      </h3>
      <div
        id={contentId}
        hidden={collapsible && !isOpen}
        className={
          divided
            ? 'flex flex-col divide-y divide-[#2F3737]/60 px-3 py-1 text-xs'
            : 'flex flex-col gap-3 p-3 text-xs'
        }
      >
        {children}
      </div>
    </section>
  )
}

function ChannelValue({
  share,
  produced,
}: {
  share: string
  produced: string
}) {
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span>{share}</span>
      <span className="text-[11px] font-normal text-neutral-400">{produced}</span>
    </span>
  )
}

function formatBps(bps: number | undefined) {
  return bps == null ? '--' : `${formatDecimal(bps / 100)}%`
}

function formatUtc8(seconds: number | undefined) {
  if (!seconds) return '--'
  const time = new Date(seconds * 1000 + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ')
  return m.dashboard_vault_first_execute_value({ time })
}

function formatInterval(seconds: number | undefined) {
  if (!seconds) return '--'
  if (seconds % 86_400 === 0) {
    return m.duration_days({ count: formatDecimal(seconds / 86_400) })
  }
  if (seconds % 3_600 === 0) {
    return m.dashboard_vault_interval_hours({
      count: formatDecimal(seconds / 3_600),
    })
  }
  return m.dashboard_vault_interval_minutes({
    count: formatDecimal(Math.round(seconds / 60)),
  })
}

function formatBnbText(wei: string | undefined) {
  if (!wei) return '--'
  try {
    return `${formatDecimal(formatEther(BigInt(wei)))} BNB`
  } catch {
    return '--'
  }
}

function formatProduced(
  yieldValue: TokenCardState['taxYield'],
  loading: boolean,
  format: (yieldValue: NonNullable<TokenCardState['taxYield']>) => string,
) {
  if (loading || yieldValue === undefined) return '--'
  if (yieldValue === null) return '--'
  return format(yieldValue)
}

const TaxAllocationDetails: React.FC<{
  token: BoardItemResponse
  symbol: string
  taxYield?: TokenCardState['taxYield']
  taxYieldLoading: boolean
}> = ({ token, symbol, taxYield, taxYieldLoading }) => {
  const configured = token.marketBps != null
  const dividendBps = token.dividendBps ?? 0
  const minBalance = String(token.minDividendBalance ?? '0')
  const tokenAmount = (amount: bigint) =>
    symbol && symbol !== '--'
      ? m.dashboard_token_amount({
          amount: formatTokenAmount(amount),
          symbol,
        })
      : formatTokenAmount(amount)

  return (
    <DetailSection title={m.dashboard_tax_allocation()} collapsible>
      <DetailRow
        icon={PercentIcon}
        label={m.dashboard_tax_channel_creator()}
        value={
          <ChannelValue
            share={formatBps(configured ? token.marketBps : undefined)}
            produced={formatProduced(taxYield, taxYieldLoading, (value) =>
              formatBnbAmount(value.marketingBNB),
            )}
          />
        }
      />
      <DetailRow
        icon={PercentIcon}
        label={m.dashboard_tax_channel_burn()}
        value={
          <ChannelValue
            share={formatBps(configured ? (token.deflationBps ?? 0) : undefined)}
            produced={formatProduced(taxYield, taxYieldLoading, (value) =>
              tokenAmount(value.burnedTokens),
            )}
          />
        }
      />
      <DetailRow
        icon={PercentIcon}
        label={m.dashboard_tax_channel_dividend()}
        value={
          <ChannelValue
            share={formatBps(configured ? dividendBps : undefined)}
            produced={formatProduced(taxYield, taxYieldLoading, (value) =>
              formatBnbAmount(value.dividendBNB),
            )}
          />
        }
      />
      <DetailRow
        icon={PercentIcon}
        label={m.dashboard_tax_channel_liquidity()}
        value={
          <ChannelValue
            share={formatBps(configured ? (token.lpBps ?? 0) : undefined)}
            produced={formatProduced(taxYield, taxYieldLoading, (value) =>
              `${formatBnbAmount(value.liquidityBNB)} / ${tokenAmount(value.liquidityTokens)}`,
            )}
          />
        }
      />
      {configured && dividendBps > 0 && (
        <DetailRow
          icon={CoinsIcon}
          label={m.dashboard_tax_min_balance()}
          value={
            symbol && symbol !== '--'
              ? m.dashboard_token_amount({
                  amount: formatDecimal(minBalance),
                  symbol,
                })
              : formatDecimal(minBalance)
          }
        />
      )}
    </DetailSection>
  )
}

const VaultConfigDetails: React.FC<{ token: BoardItemResponse }> = ({
  token,
}) => {
  if (token.buybackVaultEnabled !== 1) return null

  const trigger = token.triggerType ?? 0
  const includesTime = trigger === 0 || trigger === 2
  const includesBalance = trigger === 1 || trigger === 2
  const triggerLabel =
    trigger === 1
      ? m.dashboard_vault_trigger_balance()
      : trigger === 2
        ? m.dashboard_vault_trigger_both()
        : m.dashboard_vault_trigger_time()

  return (
    <DetailSection title={m.dashboard_vault_config()} collapsible>
      <DetailRow
        icon={CoinsIcon}
        label={m.dashboard_vault_mode()}
        value={
          token.mode === 1
            ? m.dashboard_vault_mode_lp()
            : m.dashboard_vault_mode_token()
        }
      />
      <DetailRow
        icon={ShieldCheckIcon}
        label={m.dashboard_vault_trigger()}
        value={triggerLabel}
      />
      {includesTime && (
        <DetailRow
          icon={ShieldCheckIcon}
          label={m.dashboard_vault_first_execute()}
          value={formatUtc8(token.firstExecuteAt)}
        />
      )}
      {includesBalance && (
        <DetailRow
          icon={CoinsIcon}
          label={m.dashboard_vault_trigger_amount()}
          value={formatBnbText(token.triggerAmount)}
          mono
        />
      )}
      <DetailRow
        icon={ShieldCheckIcon}
        label={m.dashboard_vault_interval()}
        value={formatInterval(token.intervalSeconds)}
      />
      <DetailRow
        icon={CoinsIcon}
        label={m.dashboard_vault_buyback_amount()}
        value={formatBnbText(token.buybackAmount)}
        mono
      />
    </DetailSection>
  )
}

/**
 * Live totals from the token's buyback vault, read from chain rather than the
 * backend echo, so they reflect what actually executed. Rendered only for
 * tokens that have a vault; a pending or failed read shows "--" rather than a
 * misleading zero.
 */
const VaultRuntimeDetails: React.FC<{
  token: BoardItemResponse
  symbol: string
  stats?: BuybackVaultStats | null
  loading: boolean
}> = ({ token, symbol, stats, loading }) => {
  if (token.buybackVaultEnabled !== 1 && !stats) return null

  // Fall back to the submitted mode while the read settles, so the burn row
  // still picks the right label.
  const isLpMode = (stats?.mode ?? Number(token.mode ?? 0)) === 1
  const renderValue = (render: (stats: BuybackVaultStats) => string) =>
    loading || !stats ? '--' : render(stats)
  const tokenAmount = (amount: bigint) =>
    symbol && symbol !== '--'
      ? m.dashboard_token_amount({ amount: formatTokenAmount(amount), symbol })
      : formatTokenAmount(amount)

  return (
    <DetailSection title={m.dashboard_vault_runtime()} collapsible>
      <DetailRow
        icon={FlameIcon}
        label={
          isLpMode
            ? m.dashboard_vault_total_lp_burned()
            : m.dashboard_vault_total_burned()
        }
        value={renderValue((value) =>
          isLpMode
            ? formatTokenAmount(value.totalLpBurned)
            : tokenAmount(value.totalBurnedToken),
        )}
      />
      <DetailRow
        icon={WalletIcon}
        label={m.dashboard_vault_total_spent()}
        value={renderValue((value) => formatBnbAmount(value.totalBuybackBNB))}
      />
      <DetailRow
        icon={RepeatIcon}
        label={m.dashboard_vault_executions()}
        value={renderValue((value) => formatDecimal(value.buybackCount.toString()))}
      />
      <DetailRow
        icon={CoinsIcon}
        label={m.dashboard_vault_treasury()}
        value={renderValue((value) => formatBnbAmount(value.treasuryBNB))}
      />
    </DetailSection>
  )
}
