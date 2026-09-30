import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { isAddress, type Address } from 'viem'
import { Check, Coins, Copy, ExternalLink } from 'lucide-react'

import pancakeIcon from '@/assets/svgs/pancake.svg'
import { getTokenByContractAddress } from '@/api/token'
import { TokenChart } from '@/components/token/token-chart'
import { TokenInfo } from '@/components/token/token-info'
import { TokenLayout } from '@/layouts/token-layout'
import { TokenPresale } from '@/components/token/token-presale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTokenGate } from '@/hooks/use-token-gate'
import { useBnbUsdtPrice } from '@/hooks/use-bnb-usdt-price'
import { useTokenPrice } from '@/hooks/use-token-price'
import {
  formatCompactNumber,
  formatDecimal,
  formatPercent,
  formatTokenAmount,
} from '@/lib/format'
import { getPancakeSwapUrl } from '@/lib/links'
import { formatAddress } from '@/lib/utils'
import { getExplorerAddressUrl } from '@/lib/web3'
import { TAX_CHANNELS, type TaxChannelKey } from '@/lib/tax-channels'
import { m } from '@/paraglide/messages.js'

type TabType = 'PRESALE' | 'CHART' | 'INFO'

const tabCommonClass = 'relative pb-1 cursor-pointer transition-colors'
const tabLineClass =
  'absolute bottom-0 left-1/2 w-3 h-0.5 -translate-x-1/2 bg-foreground'

export const TokenPage = () => {
  const { address: routeAddress = '' } = useParams<{ address: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('PRESALE')
  const [copied, setCopied] = useState(false)

  const tokenAddress = isAddress(routeAddress)
    ? (routeAddress.toLowerCase() as Address)
    : undefined

  const {
    data: token,
    isLoading: isTokenLoading,
    isError: isTokenError,
  } = useQuery({
    queryKey: ['tokenDetail', tokenAddress],
    queryFn: ({ signal }) => getTokenByContractAddress(tokenAddress!, signal),
    enabled: Boolean(tokenAddress),
    staleTime: 30_000,
  })

  const gate = useTokenGate(tokenAddress, token?.presaleAddress, {
    refetchInterval: 15_000,
    watchPair: true,
  })
  const { priceBNB, marketCapBNB, changePercent } = useTokenPrice({
    tokenAddress: gate.tokenAddress,
    pairAddress: gate.pairAddress,
    presalePrice: gate.presalePrice,
    totalSupply: gate.totalSupply,
    tokenDecimals: gate.tokenDecimals,
    managedPairReads: gate.pairReads,
  })

  const isLaunched = (gate.tokenState ?? 0) >= 2 || gate.presaleStatus === 3
  const hasPresale = gate.presaleConfigured || gate.presaleEnabled
  const visibleTabs: Array<{ value: TabType; label: string }> = gate.isLoading
    ? [{ value: 'INFO', label: m.token_tab_info() }]
    : isLaunched
      ? [
          { value: 'CHART', label: m.token_tab_chart() },
          { value: 'INFO', label: m.token_tab_info() },
        ]
      : hasPresale
        ? [
            { value: 'PRESALE', label: m.token_tab_presale() },
            { value: 'INFO', label: m.token_tab_info() },
          ]
        : [{ value: 'INFO', label: m.token_tab_info() }]
  const displayedTab = visibleTabs.some((tab) => tab.value === activeTab)
    ? activeTab
    : visibleTabs[0].value

  const tokenName = !tokenAddress
    ? m.token_invalid_address_title()
    : isTokenLoading
      ? m.token_loading()
      : token?.name ||
        (isTokenError ? m.token_load_error_title() : m.token_unknown_name())
  const tokenSymbol = token?.symbol ? `$${token.symbol}` : '--'
  const explorerUrl = getExplorerAddressUrl(tokenAddress)
  const externalUrl = token?.website || explorerUrl
  const bnbUsdtPrice = useBnbUsdtPrice()
  const priceUsdt =
    priceBNB !== null && bnbUsdtPrice !== null ? priceBNB * bnbUsdtPrice : null
  const priceText = priceUsdt === null ? '--' : `$${formatDecimal(priceUsdt)}`
  const changeText =
    changePercent === null ? '--' : formatPercent(changePercent)
  const supplyText =
    gate.totalSupply > 0n
      ? formatTokenAmount(gate.totalSupply, gate.tokenDecimals)
      : '--'
  const displayedMarketCap =
    isLaunched && marketCapBNB !== null && bnbUsdtPrice !== null
      ? marketCapBNB * bnbUsdtPrice
      : null
  const marketCapText =
    displayedMarketCap === null
      ? '--'
      : `$${formatCompactNumber(displayedMarketCap)}`
  const buyTax =
    token?.buyTax ??
    (gate.buyTaxBps === undefined ? null : gate.buyTaxBps / 100)
  const sellTax =
    token?.sellTax ??
    (gate.sellTaxBps === undefined ? null : gate.sellTaxBps / 100)

  const allocationBps: Record<TaxChannelKey, number | undefined> = {
    creator: token?.marketBps,
    burn: token?.deflationBps,
    dividend: token?.dividendBps,
    liquidity: token?.lpBps,
  }
  const taxAllocation = TAX_CHANNELS.map((channel) => ({
    ...channel,
    percent: (allocationBps[channel.key] ?? 0) / 100,
  })).filter((channel) => channel.percent > 0)

  const taxDetailsContent = (
    <>
      <span className="text-xs">税收详情</span>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="size-4 shrink-0"
      >
        <path
          d="M11.7712 3.62846C11.9304 3.62846 12.0832 3.69179 12.1957 3.80432C12.3082 3.91684 12.3715 4.06963 12.3715 4.22876V9.88562H11.1709V5.67796L4.41751 12.4314L3.56861 11.5825L10.322 4.82907L6.11438 4.82907L6.11438 3.62846H11.7712Z"
          fill="currentColor"
        ></path>
      </svg>
    </>
  )

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

  return (
    <TokenLayout>
      <header className="shrink-0 bg-[#070808] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9.5 bg-[#141517] after:border-foreground/10">
              <AvatarImage src={token?.coinImg || undefined} alt={tokenName} />
              <AvatarFallback className="bg-[#141517] text-[#FFA546]">
                <Coins className="size-5 text-[#FFA546]" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-white">
                {tokenSymbol}
              </span>
              {externalUrl ? (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={
                    token?.website
                      ? m.token_open_website({ name: tokenName })
                      : m.token_view_explorer()
                  }
                  className="group mt-1 flex items-center gap-1 truncate text-xs text-[#A0A3A7] focus-visible:outline-none"
                >
                  <span className="truncate leading-none">{tokenName}</span>
                  <ExternalLink className="size-3.5 shrink-0 transition-colors group-hover:text-[#FFA546] group-focus-visible:text-[#FFA546]" />
                </a>
              ) : (
                <span className="mt-1 truncate text-xs leading-none text-[#A0A3A7]">
                  {tokenName}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col text-right">
            <span className="text-base font-semibold text-foreground">
              {priceText}
            </span>
            <span
              className={
                changePercent === null
                  ? 'text-xs text-[#A0A3A7]'
                  : changePercent >= 0
                    ? 'text-xs text-[#0ECB81]'
                    : 'text-xs text-[#F7594B]'
              }
            >
              {changeText}
            </span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 text-xs font-normal">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <svg
                viewBox="0 0 4.5 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="h-3 shrink-0 text-[#A0A3A7]"
              >
                <path
                  d="M4.25 0.5H0.5V13.5H4.25"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
              <div className="mx-1 flex items-center text-xs">
                <span className="mr-1 text-[#A0A3A7]">CA</span>
                <button
                  type="button"
                  aria-label={m.token_copy_address()}
                  disabled={!tokenAddress}
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center gap-1 text-foreground underline underline-offset-2 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                >
                  {formatAddress(tokenAddress)}
                  {copied ? (
                    <Check className="ml-1 size-3 text-[#0ECB81]" />
                  ) : (
                    <Copy className="ml-1 size-3" />
                  )}
                </button>
              </div>
              <svg
                viewBox="0 0 4.5 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="h-3 shrink-0 -scale-x-100 text-[#A0A3A7]"
              >
                <path
                  d="M4.25 0.5H0.5V13.5H4.25"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div className="flex items-center text-[#fb5f16] gap-1">
              <svg
                viewBox="0 0 4.5 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="h-3 shrink-0"
              >
                <path
                  d="M4.25 0.5H0.5V13.5H4.25"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
              {tokenAddress ? (
                <Link
                  to={`/taxinfo/${tokenAddress}`}
                  className="min-w-0 inline-flex items-center gap-0.5 text-[#FE810B]"
                >
                  {taxDetailsContent}
                </Link>
              ) : (
                <span className="min-w-0 inline-flex items-center gap-0.5 text-[#FE810B]">
                  {taxDetailsContent}
                </span>
              )}
              <svg
                viewBox="0 0 4.5 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="h-3 shrink-0 -scale-x-100"
              >
                <path
                  d="M4.25 0.5H0.5V13.5H4.25"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </div>
            {tokenAddress && (
              <a
                href={getPancakeSwapUrl(tokenAddress)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="PancakeSwap"
                title="PancakeSwap"
                className="inline-flex shrink-0 items-center"
              >
                <img
                  src={pancakeIcon}
                  alt="PancakeSwap"
                  width={18}
                  height={18}
                  loading="lazy"
                  decoding="async"
                  className="h-4.5 w-4.5"
                />
              </a>
            )}
          </div>
        </div>

        {taxAllocation.length > 0 && (
          <div className="mt-4 flex items-center gap-1.5 min-w-0 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
            {taxAllocation.map((channel) => (
              <span
                key={channel.key}
                className="flex h-4 shrink-0 items-center border px-1 text-[10px] font-semibold uppercase leading-[1.4] tracking-normal"
                style={{ borderColor: channel.color, color: channel.color }}
              >
                {channel.label} {formatDecimal(channel.percent)}%
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-5 divide-x divide-foreground/10 border-t border-t-foreground/5 pt-3 text-center text-xs">
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-[#84888C]">{m.token_total_supply()}</span>
            <span className="truncate text-foreground">{supplyText}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-[#84888C]">{m.token_volume_24h()}</span>
            <span className="text-foreground">--</span>
          </div>
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-[#84888C]">{m.token_market_cap()}</span>
            <span className="truncate text-foreground">{marketCapText}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-[#84888C]">{m.token_holders()}</span>
            <span className="text-foreground">--</span>
          </div>
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-[#84888C]">{m.token_buy_sell_tax()}</span>
            <span className="truncate text-foreground">
              {buyTax === null || sellTax === null
                ? '--'
                : `${formatDecimal(buyTax)}% / ${formatDecimal(sellTax)}%`}
            </span>
          </div>
        </div>
      </header>

      <div className="relative mt-4 px-3">
        <div
          role="tablist"
          aria-label={m.token_content_tabs()}
          className="flex items-center gap-4 border-b border-b-[#484B51] text-sm font-semibold"
        >
          {visibleTabs.map(({ value: tab, label }) => {
            const isActive = displayedTab === tab

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${tabCommonClass} ${isActive ? 'text-foreground' : 'text-[#A0A3A7]'}`}
                onClick={() => setActiveTab(tab)}
              >
                {label}
                {isActive && (
                  <span aria-hidden="true" className={tabLineClass} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <>
        {displayedTab === 'PRESALE' && (
          <section className="p-3 flex-1">
            <TokenPresale gate={gate} symbol={token?.symbol || '--'} />
          </section>
        )}
        {displayedTab === 'CHART' && (
          <section className="mx-3 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
            <TokenChart
              tokenAddress={gate.tokenAddress}
              pairAddress={gate.pairAddress}
            />
          </section>
        )}
        {displayedTab === 'INFO' && (
          <section className="px-3 pt-6 flex-1">
            <TokenInfo
              token={token}
              totalSupply={gate.totalSupply}
              tokenDecimals={gate.tokenDecimals}
              marketCapUsdt={displayedMarketCap}
              changePercent={changePercent}
              creatorAddress={gate.creatorAddress}
            />
          </section>
        )}
      </>

      <div className="z-30 bg-[#070808] px-3 pt-1 relative shrink-0">
        <button
          type="button"
          className="ui20-chamfer flex h-10.25 w-full items-center justify-center border border-white bg-white font-jetbrains text-base font-semibold leading-[1.4] text-[#070808] [--ui20-chamfer-bg:#FFFFFF] [--ui20-chamfer-border:#FFFFFF]"
        >
          <span>交易</span>
        </button>
      </div>
    </TokenLayout>
  )
}
