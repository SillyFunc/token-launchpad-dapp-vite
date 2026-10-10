import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Flame,
  SlidersHorizontal,
  AlignJustify,
  Grid2X2,
  ChevronDown,
  Coins,
} from 'lucide-react'

import SortIcon from '@/assets/svgs/sort-default.svg'
import boardBanner from '@/assets/images/board-banner.png'
import type { BoardItemResponse } from '@/api/board'
import { usePopularTokens } from '@/hooks/use-board'
import { useBoardPricing } from '@/hooks/use-board-pricing'
import {
  formatCompactNumber,
  formatDecimalText,
  formatPercent,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

const FILTER_OPTIONS = [
  { value: 'hot', label: () => m.board_filter_hot() },
  { value: 'new', label: () => m.board_filter_new() },
  { value: 'market_cap', label: () => m.board_filter_market_cap() },
  { value: 'gainers', label: () => m.board_filter_gainers() },
] as const

type Pricing = ReturnType<typeof useBoardPricing>[string] | undefined

function isConfiguredTaxRate(value: number | undefined): boolean {
  return typeof value === 'number' && value > 0
}

export const BoardPage = () => {
  const [activeFilter, setActiveFilter] = useState<string>('hot')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const { data: tokens, isLoading, isError, refetch } = usePopularTokens()

  const tokenList = Array.isArray(tokens?.content) ? tokens.content : []

  // Page-wide pricing comes from 3 batched multicalls; TokenRow stays presentational.
  const pricingMap = useBoardPricing(tokenList)

  const activeFilterLabel =
    FILTER_OPTIONS.find((option) => option.value === activeFilter)?.label() ??
    activeFilter

  return (
    <div className="relative mx-auto flex w-full flex-col pb-24 pt-3 text-white space-y-3">
      <div className="relative w-full overflow-hidden border border-white/10 bg-black">
        <img
          src={boardBanner}
          alt="Banner"
          className="h-32 w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5 pointer-events-none">
          <div className="h-1.5 w-4 rounded-full bg-[#F8EA25]" />
          <div className="size-1.5 rounded-full bg-[#333333]" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex h-7 items-center gap-1 rounded border border-[#FE810B]/60 bg-[#FD810B1A] px-2.5 text-xs text-[#FB5F16] transition-all active:translate-y-0.5"
          >
            <Flame className="size-3.5 text-[#FB5F16]" />
            <span className="font-medium">{activeFilterLabel}</span>
            <ChevronDown className="size-3 text-[#FB5F16]" />
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute left-0 top-full z-40 mt-1 flex w-24 flex-col rounded border border-white/10 bg-[#141517] p-1 shadow-xl">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setActiveFilter(opt.value)
                    setIsFilterDropdownOpen(false)
                  }}
                  className={`flex w-full items-center px-2 py-1.5 text-left text-xs rounded transition-colors ${
                    activeFilter === opt.value
                      ? 'bg-white/10 font-bold text-[#FB5F16]'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {opt.label()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 shrink-0 items-center gap-2 border border-[#484B51] bg-background p-2">
            <button
              type="button"
              aria-label="列表"
              aria-pressed="true"
              className="grid h-4 w-4 shrink-0 touch-manipulation place-items-center"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
              >
                <path
                  d="M1.72384 2.39052C1.97389 2.14048 2.31302 2 2.66665 2C3.02027 2 3.35941 2.14048 3.60946 2.39052C3.8595 2.64057 3.99998 2.97971 3.99998 3.33333C3.99998 3.68696 3.8595 4.02609 3.60946 4.27614C3.35941 4.52619 3.02027 4.66667 2.66665 4.66667C2.31302 4.66667 1.97389 4.52619 1.72384 4.27614C1.47379 4.02609 1.33331 3.68696 1.33331 3.33333C1.33331 2.97971 1.47379 2.64057 1.72384 2.39052Z"
                  fill="#FE810B"
                ></path>
                <path
                  d="M1.72384 11.7239C1.97389 11.4738 2.31303 11.3333 2.66665 11.3333C3.02027 11.3333 3.35941 11.4738 3.60946 11.7239C3.8595 11.9739 3.99998 12.313 3.99998 12.6667C3.99998 13.0203 3.8595 13.3594 3.60946 13.6095C3.35941 13.8595 3.02027 14 2.66665 14C2.31303 14 1.97389 13.8595 1.72384 13.6095C1.47379 13.3594 1.33331 13.0203 1.33331 12.6667C1.33331 12.313 1.47379 11.9739 1.72384 11.7239Z"
                  fill="#FE810B"
                ></path>
                <path
                  d="M1.72384 7.05719C1.97389 6.80714 2.31302 6.66667 2.66665 6.66667C3.02027 6.66667 3.35941 6.80714 3.60946 7.05719C3.8595 7.30724 3.99998 7.64638 3.99998 8C3.99998 8.35362 3.8595 8.69276 3.60946 8.94281C3.35941 9.19286 3.02027 9.33333 2.66665 9.33333C2.31302 9.33333 1.97389 9.19286 1.72384 8.94281C1.47379 8.69276 1.33331 8.35362 1.33331 8C1.33331 7.64638 1.47379 7.30724 1.72384 7.05719Z"
                  fill="#FE810B"
                ></path>
                <path
                  d="M6.66665 2.66667C6.29846 2.66667 5.99998 2.96514 5.99998 3.33333C5.99998 3.70152 6.29846 4 6.66665 4H14.6666C15.0348 4 15.3333 3.70152 15.3333 3.33333C15.3333 2.96514 15.0348 2.66667 14.6666 2.66667H6.66665Z"
                  fill="#FE810B"
                ></path>
                <path
                  d="M6.66665 7.33333C6.29846 7.33333 5.99998 7.63181 5.99998 8C5.99998 8.36819 6.29846 8.66667 6.66665 8.66667H14.6666C15.0348 8.66667 15.3333 8.36819 15.3333 8C15.3333 7.63181 15.0348 7.33333 14.6666 7.33333H6.66665Z"
                  fill="#FE810B"
                ></path>
                <path
                  d="M6.66665 12C6.29846 12 5.99998 12.2985 5.99998 12.6667C5.99998 13.0349 6.29846 13.3333 6.66665 13.3333H14.6666C15.0348 13.3333 15.3333 13.0349 15.3333 12.6667C15.3333 12.2985 15.0348 12 14.6666 12H6.66665Z"
                  fill="#FE810B"
                ></path>
              </svg>
            </button>
            <span className="h-3.5 w-px shrink-0 bg-[#484B51]"></span>
            <button
              type="button"
              aria-label="网格"
              aria-pressed="false"
              className="grid h-4 w-4 shrink-0 touch-manipulation place-items-center"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M2.66665 1.3335C1.93027 1.3335 1.33331 1.93045 1.33331 2.66683V6.00016C1.33331 6.73656 1.93027 7.3335 2.66665 7.3335H5.99998C6.73637 7.3335 7.33331 6.73655 7.33331 6.00016V2.66683C7.33331 1.93046 6.73638 1.3335 5.99998 1.3335H2.66665ZM2.66665 2.66683H5.99998V6.00016H2.66665V2.66683Z"
                  fill="#FFFFFF"
                ></path>
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M2.66665 8.66683C1.93027 8.66683 1.33331 9.26377 1.33331 10.0002V13.3335C1.33331 14.0699 1.93027 14.6668 2.66665 14.6668H5.99998C6.73637 14.6668 7.33331 14.0699 7.33331 13.3335V10.0002C7.33331 9.26377 6.73637 8.66683 5.99998 8.66683H2.66665ZM2.66665 10.0002H5.99998V13.3335H2.66665V10.0002Z"
                  fill="#FFFFFF"
                ></path>
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M8.66665 2.66683C8.66665 1.93046 9.26358 1.3335 9.99998 1.3335H13.3333C14.0697 1.3335 14.6666 1.93046 14.6666 2.66683V6.00016C14.6666 6.73655 14.0697 7.3335 13.3333 7.3335H9.99998C9.26359 7.3335 8.66665 6.73655 8.66665 6.00016V2.66683ZM13.3333 2.66683H9.99998V6.00016H13.3333V2.66683Z"
                  fill="#FFFFFF"
                ></path>
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M9.99998 8.66683C9.26359 8.66683 8.66665 9.26377 8.66665 10.0002V13.3335C8.66665 14.0699 9.26359 14.6668 9.99998 14.6668H13.3333C14.0697 14.6668 14.6666 14.0699 14.6666 13.3335V10.0002C14.6666 9.26377 14.0697 8.66683 13.3333 8.66683H9.99998ZM9.99998 10.0002H13.3333V13.3335H9.99998V10.0002Z"
                  fill="#FFFFFF"
                ></path>
              </svg>
            </button>
            {/* <button
              type="button"
              aria-label={m.board_view_list()}
              onClick={() => setViewMode('list')}
              className={`flex size-7 items-center justify-center transition-colors ${
                viewMode === 'list' ? 'text-[#FB5F16]' : 'text-neutral-500'
              }`}
            >
              <AlignJustify className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={m.board_view_grid()}
              onClick={() => setViewMode('grid')}
              className={`flex size-7 items-center justify-center transition-colors ${
                viewMode === 'grid' ? 'text-[#FB5F16]' : 'text-neutral-500'
              }`}
            >
              <Grid2X2 className="size-3.5" />
            </button> */}
          </div>

          {/* <button
            type="button"
            aria-label={m.board_more_filters()}
            className="flex size-7 items-center justify-center rounded border border-white/10 bg-black text-white transition-colors hover:bg-white/5"
          >
            <SlidersHorizontal className="size-3.5" />
          </button> */}
        </div>
      </div>

      <div className="w-full border-x border-b border-[#484B51] bg-background">
        <div className="sticky top-14.5 z-20 h-10 grid grid-cols-[minmax(0,1fr)_64px_64px] gap-5 items-center border-y border-y-[#484B51] bg-[#131516] px-2 text-[#A0A3A7] text-[0.625rem]">
          <span className="truncate min-w-0">市值/24H 交易額/稅率</span>
          <span className="text-right">价格</span>
          <button
            type="button"
            aria-label="24h 涨跌幅"
            className="inline-flex min-w-0 items-center gap-0.5 uppercase transition-colors hover:text-white justify-end text-right"
          >
            <span className="truncate">24h 涨跌幅</span>
            <img
              alt=""
              aria-hidden
              src={SortIcon}
              className="shrink-0 size-3.5"
            />
          </button>
        </div>
        <div className="divide-y divide-[#1F2023] bg-transparent">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid h-13 items-center bg-background px-2 grid-cols-[minmax(0,1fr)_64px_64px] gap-5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-7.5 shrink-0 animate-pulse bg-[#2F3737]" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-3 w-20 animate-pulse bg-[#2F3737]" />
                    <div className="h-2.5 w-32 animate-pulse bg-[#2F3737]" />
                  </div>
                </div>
                <div className="h-3 w-12 animate-pulse bg-[#2F3737] justify-self-end" />
                <div className="h-6 w-full animate-pulse bg-[#2F3737]" />
              </div>
            ))
          ) : isError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-neutral-500">
              <Coins className="mb-2 size-6 text-neutral-600" />
              <span>{m.board_load_error()}</span>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-3 border border-[#FE810B]/60 bg-[#FD810B1A] px-4 py-1.5 text-xs font-medium text-[#FB5F16] transition-all hover:bg-[#FD810B33] active:translate-y-0.5"
              >
                {m.board_reload()}
              </button>
            </div>
          ) : tokenList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-neutral-500">
              <Coins className="mb-2 size-6 text-neutral-600" />
              <span>{m.board_empty()}</span>
            </div>
          ) : (
            tokenList.map((token) => {
              const key = String(token.coinContractAddress || '').toLowerCase()
              return (
                <BoardListRow
                  key={token.id}
                  token={token}
                  pricing={pricingMap[key]}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function TaxBadge({ showPresale }: { showPresale: boolean }) {
  return (
    <>
      <button
        type="button"
        className="h-3.5 text-[0.625rem] shrink-0 flex items-center leading-none border border-[#FE810B] text-[#FE810B]"
      >
        <span>税收</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="ml-px size-3.5 shrink-0"
        >
          <path
            d="M11.7712 3.62846C11.9304 3.62846 12.0832 3.69179 12.1957 3.80432C12.3082 3.91684 12.3715 4.06963 12.3715 4.22876V9.88562H11.1709V5.67796L4.41751 12.4314L3.56861 11.5825L10.322 4.82907L6.11438 4.82907L6.11438 3.62846H11.7712Z"
            fill="currentColor"
          ></path>
        </svg>
      </button>
      {showPresale && (
        <span className="inline-flex h-3.5 shrink-0 items-center border border-[#FFA546]/40 bg-[#FFA546]/15 px-1 text-[0.625rem] leading-none text-[#FFA546]">
          预售中
        </span>
      )}
    </>
  )
}

function BoardListRow({
  token,
  pricing,
}: {
  token: BoardItemResponse
  pricing: Pricing
}) {
  const navigate = useNavigate()
  const tokenAddress = token.coinContractAddress || ''

  const stage = pricing?.stage ?? 'not_launched'
  const isPresale = stage === 'presale'

  const marketCap = pricing?.liquidityUsd ?? null
  const volume24h = pricing?.volume24h ?? null
  const priceUsd = pricing?.priceUsd ?? null
  const change24h = pricing?.changePercent ?? null

  const hasTax =
    isConfiguredTaxRate(token.buyTax) || isConfiguredTaxRate(token.sellTax)

  const taxText = hasTax
    ? `${isConfiguredTaxRate(token.buyTax) ? token.buyTax : 0}%/${isConfiguredTaxRate(token.sellTax) ? token.sellTax : 0}%`
    : '--'

  const isPositive = change24h !== null && change24h >= 0

  const handleNavigate = () => {
    if (tokenAddress) navigate(`/token/${tokenAddress}`)
  }

  return (
    <div
      role={tokenAddress ? 'link' : undefined}
      tabIndex={tokenAddress ? 0 : undefined}
      onClick={handleNavigate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleNavigate()
        }
      }}
      className="grid h-13 items-center bg-background px-2 text-white [content-visibility:auto] [contain-intrinsic-size:auto_52px] cursor-pointer grid-cols-[minmax(0,1fr)_64px_64px] gap-5"
    >
      <div className="h-full flex items-center gap-2.5">
        <div className="shrink-0 overflow-hidden border border-[#313131] relative size-7.5 bg-[#111]">
          {token.coinImg ? (
            <img
              src={token.coinImg}
              alt={token.name}
              fetchPriority="low"
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
              className="absolute inset-0 size-full object-cover transition-opacity duration-150 opacity-100"
            />
          ) : (
            <Coins className="absolute inset-0 m-auto size-4 text-[#FFA546]" />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="flex items-center min-w-0 gap-1">
            <span className="min-w-0 max-w-28 truncate text-sm font-medium uppercase tracking-0 text-foreground">
              ${token.symbol || token.name}
            </span>
            {hasTax && <TaxBadge showPresale={isPresale} />}
          </div>
          <div className="flex items-center gap-1 text-[0.625rem] text-[#A0A3A7] min-w-0">
            <span className="truncate">
              {marketCap !== null ? `$${formatCompactNumber(marketCap)}` : '--'}
            </span>
            <div className="h-1.75 w-px bg-[#484B51]"></div>
            <span className="truncate">
              {volume24h !== null ? `$${formatCompactNumber(volume24h)}` : '--'}
            </span>
            <div className="h-1.75 w-px bg-[#484B51]"></div>
            <span className="truncate">{taxText}</span>
          </div>
        </div>
      </div>
      <div className="min-w-0 truncate text-right font-medium tracking-normal text-foreground text-xs">
        {priceUsd !== null ? `$${formatDecimalText(priceUsd, 5)}` : '--'}
      </div>
      <div className="text-right">
        {change24h === null ? (
          <span className="inline-flex h-7 items-center justify-center font-medium tracking-normal text-white/40 bg-white/5 text-xs w-full">
            --
          </span>
        ) : (
          <span
            className={cn(
              'inline-flex h-7 items-center justify-center font-medium tracking-normal text-white text-xs w-full',
              isPositive ? 'bg-[#2bc235]' : 'bg-[#FF4A55]',
            )}
          >
            {formatPercent(change24h)}
          </span>
        )}
      </div>
    </div>
  )
}
