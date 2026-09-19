import { useState, type ReactNode } from 'react'
import {
  CheckIcon,
  CoinsIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PercentIcon,
  SendIcon,
  ShieldCheckIcon,
  WalletIcon,
} from 'lucide-react'
import type { Address } from 'viem'

import type { BoardItemResponse } from '@/api/board'
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

          <div className="flex flex-col divide-y divide-[#2F3737]/60 border border-[#2F3737] bg-[#17191b] px-3 py-1 text-xs">
            {details}
          </div>

          {presaleDetails}

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

export interface CopyableAddressProps {
  address: Address
}

export interface TokenBasicDetailsProps {
  state: TokenCardState
}

/** Detail rows every token has, regardless of how it is launched. */
export const TokenBasicDetails: React.FC<TokenBasicDetailsProps> = ({
  state,
}) => {
  const { token, tokenAddress, reservedAddress, buyTax, sellTax, totalSupply } =
    state

  return (
    <>
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
      {reservedAddress && (
        <DetailRow
          icon={WalletIcon}
          label={m.dashboard_reserved_ca()}
          value={<CopyableAddress address={reservedAddress} />}
        />
      )}
    </>
  )
}/** Address with its own copy affordance, used inside detail rows. */
export const CopyableAddress: React.FC<CopyableAddressProps> = ({ address }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2_000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <span className="font-mono" title={address}>
        {formatAddress(address)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={m.dashboard_copy_reserved_ca()}
        onClick={() => void handleCopy()}
        className="text-neutral-400 hover:text-white"
      >
        {copied ? (
          <CheckIcon className="text-green-400" aria-hidden="true" />
        ) : (
          <CopyIcon aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}
