import { type ReactNode } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { isAddress } from 'viem'

import type { TokenDetail } from '@/api/token'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { formatAddress } from '@/lib/utils'
import { formatCompactNumber, formatTokenAmount } from '@/lib/format'
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
  marketCapUsd,
  volume24hUsd,
  liquidityUsd,
  fdvUsd,
  creatorAddress,
}: {
  token?: TokenDetail
  totalSupply: bigint
  tokenDecimals: number
  marketCapUsd: number | null
  volume24hUsd: number | null
  liquidityUsd: number | null
  fdvUsd: number | null
  creatorAddress?: string
}) {
  const { copy, copiedText } = useCopyToClipboard()
  const description = token?.meta || m.token_no_description()
  const creator = creatorAddress || token?.creatorAddress || ''
  const creatorExplorerUrl = isAddress(creator)
    ? getExplorerAddressUrl(creator)
    : undefined
  const supplyText =
    totalSupply > 0n ? formatTokenAmount(totalSupply, tokenDecimals) : '--'
  const marketCapText =
    marketCapUsd === null ? '--' : `$${formatCompactNumber(marketCapUsd)}`
  const volumeText =
    volume24hUsd === null ? '--' : `$${formatCompactNumber(volume24hUsd)}`
  const liquidityText =
    liquidityUsd === null ? '--' : `$${formatCompactNumber(liquidityUsd)}`
  const fdvText = fdvUsd === null ? '--' : `$${formatCompactNumber(fdvUsd)}`
  const mediaLinks = [
    { label: m.token_website(), href: token?.website },
    { label: 'Telegram', href: token?.telegram },
    { label: 'X / Twitter', href: token?.twitter },
  ].filter(
    (item): item is { label: string; href: string } => Boolean(item.href),
  )

  return (
    <div className="flex flex-col gap-6">
      <InfoSectionTitle title={m.token_description()}>
        <p className="min-w-0 max-w-full wrap-break-word text-xs leading-5 text-[#A0A3A7]">
          {description}
        </p>
      </InfoSectionTitle>

      <InfoSectionTitle title={m.token_details()}>
        <div className="flex flex-col gap-1.5">
          <InfoRow label={m.token_liquidity()}>{liquidityText}</InfoRow>
          <InfoRow label={m.token_market_cap()}>{marketCapText}</InfoRow>
          <InfoRow label={m.token_holders()}>--</InfoRow>
          <InfoRow label={m.token_volume_24h()}>{volumeText}</InfoRow>
          <InfoRow label={m.token_fdv()}>{fdvText}</InfoRow>
          <InfoRow label={m.token_circulating_supply()}>{supplyText}</InfoRow>
          <InfoRow label={m.token_max_supply()}>{supplyText}</InfoRow>
          <InfoRow label={m.token_created_at()}>{formatCreatedAt(token?.createTime)}</InfoRow>
          <InfoRow label={m.token_creator()}>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                aria-label={m.token_copy_creator()}
                disabled={!creator}
                onClick={() => void copy(creator)}
                className="inline-flex items-center gap-1 underline underline-offset-2 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              >
                {formatAddress(creator)}
                {copiedText === creator ? (
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
