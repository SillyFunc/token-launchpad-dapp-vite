import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Flame,
  Search,
  SlidersHorizontal,
  AlignJustify,
  Grid2X2,
  ChevronDown,
  Coins,
  X,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const { data: tokens, isLoading, isError, refetch } = usePopularTokens()

  const tokenList = Array.isArray(tokens?.content) ? tokens.content : []

  // Page-wide pricing comes from 3 batched multicalls; TokenRow stays presentational.
  const pricingMap = useBoardPricing(tokenList)

  const activeFilterLabel =
    FILTER_OPTIONS.find((option) => option.value === activeFilter)?.label() ??
    activeFilter

  const displayedTokens = tokenList.filter((t) => {
    if (!searchKeyword.trim()) return true
    const kw = searchKeyword.toLowerCase()
    return (
      t.name.toLowerCase().includes(kw) ||
      t.symbol.toLowerCase().includes(kw) ||
      t.address.toLowerCase().includes(kw)
    )
  })

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
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="flex h-7 items-center gap-1 rounded border border-white/10 bg-black px-2.5 text-xs text-white transition-all hover:bg-white/5 active:translate-y-0.5"
          >
            <Search className="size-3.5 text-white" />
            <span>{m.board_search_trending()}</span>
          </button>

          <div className="flex h-7 items-center divide-x divide-white/10 rounded border border-white/10 bg-black">
            <button
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
            </button>
          </div>

          <button
            type="button"
            aria-label={m.board_more_filters()}
            className="flex size-7 items-center justify-center rounded border border-white/10 bg-black text-white transition-colors hover:bg-white/5"
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="relative flex items-center">
          <Search className="absolute left-3 size-3.5 text-neutral-500" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={m.board_search_placeholder()}
            className="h-8 w-full rounded border border-[#484b51] bg-[#131516] pl-8 pr-8 text-xs text-white placeholder:text-neutral-500 focus:border-[#FE810B] focus:outline-none"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute right-2.5 text-neutral-400 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

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
          ) : displayedTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-neutral-500">
              <Coins className="mb-2 size-6 text-neutral-600" />
              <span>
                {searchKeyword ? m.board_empty_search() : m.board_empty()}
              </span>
            </div>
          ) : (
            displayedTokens.map((token) => {
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
            <div className="h-3 w-px bg-[#484B51]"></div>
            <span className="truncate">
              {volume24h !== null ? `$${formatCompactNumber(volume24h)}` : '--'}
            </span>
            <div className="h-3 w-px bg-[#484B51]"></div>
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
