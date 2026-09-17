import { type ReactNode, useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { isAddress } from 'viem'

import type { TokenDetail } from '@/api/token'
import { formatAddress } from '@/lib/utils'
import {
  formatCompactNumber,
  formatDecimal,
  formatPercent,
  formatTokenAmount,
} from '@/lib/format'
import { getExplorerAddressUrl } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

function InfoSectionTitle({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1 text-sm text-foreground">
        <svg
          viewBox="0 0 4.5 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="size-3.5 shrink-0"
        >
          <path d="M4.25 0.5H0.5V13.5H4.25" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span>{title}</span>
        <svg
          viewBox="0 0 4.5 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="size-3.5 shrink-0 -scale-x-100"
        >
          <path d="M4.25 0.5H0.5V13.5H4.25" stroke="currentColor" strokeWidth="1" />
        </svg>
      </h2>
      {children}
    </section>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="shrink-0 text-[#A0A3A7]">{label}</span>
      <span className="min-w-0 text-right text-foreground">{children}</span>
    </div>
  )
}

function formatCreatedAt(value?: string | null) {
  if (!value) return '--'
  const numericValue = Number(value)
  const date = Number.isFinite(numericValue)
    ? new Date(numericValue < 10_000_000_000 ? numericValue * 1_000 : numericValue)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function TokenInfo({
  token,
  totalSupply,
  tokenDecimals,
  marketCapBNB,
  changePercent,
  creatorAddress,
  buyTaxBps,
  sellTaxBps,
}: {
  token?: TokenDetail
  totalSupply: bigint
  tokenDecimals: number
  marketCapBNB: number | null
  changePercent: number | null
  creatorAddress?: string
  buyTaxBps?: number
  sellTaxBps?: number
}) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const description = token?.meta || m.token_no_description()
  const creator = creatorAddress || token?.creatorAddress || ''
  const feeRecipient = token?.feeRecipient || ''
  const creatorExplorerUrl = isAddress(creator)
    ? getExplorerAddressUrl(creator)
    : undefined
  const feeRecipientExplorerUrl = isAddress(feeRecipient)
    ? getExplorerAddressUrl(feeRecipient)
    : undefined
  const supplyText =
    totalSupply > 0n ? formatTokenAmount(totalSupply, tokenDecimals) : '--'
  const marketCapText =
    marketCapBNB === null ? '--' : `${formatCompactNumber(marketCapBNB)} BNB`
  const changeText = changePercent === null ? '--' : formatPercent(changePercent)
  const buyTax = token?.buyTax ?? (buyTaxBps === undefined ? null : buyTaxBps / 100)
  const sellTax = token?.sellTax ?? (sellTaxBps === undefined ? null : sellTaxBps / 100)
  const changeClass =
    changePercent === null
      ? 'text-foreground'
      : changePercent >= 0
        ? 'text-[#0ECB81]'
        : 'text-[#F7594B]'
  const mediaLinks = [
    { label: m.token_website(), href: token?.website },
    { label: 'Telegram', href: token?.telegram },
    { label: 'X / Twitter', href: token?.twitter },
  ].filter(
    (item): item is { label: string; href: string } => Boolean(item.href),
  )

  const handleCopy = async (address?: string) => {
    if (!address || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      window.setTimeout(() => setCopiedAddress(null), 2_000)
    } catch {
      setCopiedAddress(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <InfoSectionTitle title={m.token_description()}>
        <p className="min-w-0 max-w-full wrap-break-word text-xs leading-5 text-[#A0A3A7]">
          {description}
        </p>
      </InfoSectionTitle>

      <InfoSectionTitle title={m.token_details()}>
        <div className="flex flex-col gap-3">
          <InfoRow label={m.token_price_change()}>
            <span className={changeClass}>{changeText}</span>
          </InfoRow>
          <InfoRow label={m.token_volume_24h()}>--</InfoRow>
          <InfoRow label={m.token_liquidity()}>--</InfoRow>
          <InfoRow label={m.token_market_cap()}>{marketCapText}</InfoRow>
          <InfoRow label={m.token_holders()}>--</InfoRow>
          <InfoRow label="FDV">{marketCapText}</InfoRow>
          <InfoRow label={m.token_total_supply()}>{supplyText}</InfoRow>
          <InfoRow label={m.token_created_at()}>{formatCreatedAt(token?.createTime)}</InfoRow>
          <InfoRow label={m.token_creator()}>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                aria-label={m.token_copy_creator()}
                disabled={!creator}
                onClick={() => void handleCopy(creator)}
                className="inline-flex items-center gap-1 underline underline-offset-2 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              >
                {formatAddress(creator)}
                {copiedAddress === creator ? (
                  <Check className="size-3 text-[#0ECB81]" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
              {creatorExplorerUrl && (
                <a
                  href={creatorExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={m.token_view_creator()}
                  className="text-[#A0A3A7] transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </span>
          </InfoRow>
          <InfoRow label={m.token_buy_tax()}>
            {buyTax === null ? '--' : `${formatDecimal(buyTax)}%`}
          </InfoRow>
          <InfoRow label={m.token_sell_tax()}>
            {sellTax === null ? '--' : `${formatDecimal(sellTax)}%`}
          </InfoRow>
          <InfoRow label={m.token_tax_duration()}>
            {token?.taxDuration ? `${token.taxDuration} days` : '--'}
          </InfoRow>
          <InfoRow label={m.token_anti_farmer_duration()}>
            {token?.antiFarmerDuration !== null && token?.antiFarmerDuration !== undefined
              ? `${token.antiFarmerDuration} days`
              : '--'}
          </InfoRow>
          <InfoRow label={m.token_fee_recipient()}>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                aria-label={m.token_copy_fee_recipient()}
                disabled={!feeRecipient}
                onClick={() => void handleCopy(feeRecipient)}
                className="inline-flex items-center gap-1 underline underline-offset-2 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              >
                {formatAddress(feeRecipient)}
                {copiedAddress === feeRecipient ? (
                  <Check className="size-3 text-[#0ECB81]" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
              {feeRecipientExplorerUrl && (
                <a
                  href={feeRecipientExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={m.token_view_fee_recipient()}
                  className="text-[#A0A3A7] transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </span>
          </InfoRow>
        </div>
      </InfoSectionTitle>

      <InfoSectionTitle title={m.token_media_info()}>
        {mediaLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {mediaLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm border border-foreground/10 bg-foreground/5 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:border-primary focus-visible:text-primary focus-visible:outline-none"
              >
                {label}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[#A0A3A7]">{m.token_no_media()}</span>
        )}
      </InfoSectionTitle>
    </div>
  )
}
