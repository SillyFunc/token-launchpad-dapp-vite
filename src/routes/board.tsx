import { useState } from 'react'
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

import boardBanner from '@/assets/images/board-banner.png'
import { usePopularTokens } from '@/hooks/use-board'
import { useBoardPricing } from '@/hooks/use-board-pricing'
import { TokenRow } from '@/components/board/token-row'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { m } from '@/paraglide/messages.js'

const FILTER_OPTIONS = [
  { value: 'hot', label: () => m.board_filter_hot() },
  { value: 'new', label: () => m.board_filter_new() },
  { value: 'market_cap', label: () => m.board_filter_market_cap() },
  { value: 'gainers', label: () => m.board_filter_gainers() },
] as const

export const BoardPage = () => {
  const [activeFilter, setActiveFilter] = useState<string>('hot')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const {
    data: tokens,
    isLoading,
    isError,
    refetch,
  } = usePopularTokens()

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

      <div className="w-full overflow-hidden border border-[#484B51] bg-background">
        <Table className="w-full table-fixed text-xs text-white">
          <TableHeader className="bg-[#131516] text-[#A0A3A7]">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-12 w-[45%] px-3 text-[#A0A3A7]">
                {m.board_column_market_cap_status()}
              </TableHead>
              <TableHead className="h-12 w-[15%] px-2 text-[#A0A3A7]">
                {m.board_column_tax()}
              </TableHead>
              <TableHead className="h-12 w-[25%] px-2 text-right text-[#A0A3A7]">
                {m.board_column_price()} (BNB)
              </TableHead>
              <TableHead className="h-12 w-[15%] px-1 text-right text-[#A0A3A7]">
                {m.board_column_change()}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/10">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow
                  key={index}
                  className="border-white/10 hover:bg-transparent"
                >
                  <TableCell colSpan={4} className="p-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="size-8 shrink-0 animate-pulse rounded-sm bg-[#2F3737]" />
                        <div className="flex flex-col gap-1.5">
                          <div className="h-3 w-20 animate-pulse rounded bg-[#2F3737]" />
                          <div className="h-2.5 w-32 animate-pulse rounded bg-[#2F3737]" />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="h-3 w-14 animate-pulse rounded bg-[#2F3737]" />
                        <div className="h-5 w-20 animate-pulse rounded bg-[#2F3737]" />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={4} className="p-0">
                  <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-neutral-500">
                    <Coins className="mb-2 size-6 text-neutral-600" />
                    <span>{m.board_load_error()}</span>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="mt-3 rounded border border-[#FE810B]/60 bg-[#FD810B1A] px-4 py-1.5 text-xs font-medium text-[#FB5F16] transition-all hover:bg-[#FD810B33] active:translate-y-0.5"
                    >
                      {m.board_reload()}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayedTokens.length === 0 ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={4} className="p-0">
                  <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-neutral-500">
                    <Coins className="mb-2 size-6 text-neutral-600" />
                    <span>
                      {searchKeyword ? m.board_empty_search() : m.board_empty()}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedTokens.map((token) => {
                const key = String(
                  token.coinContractAddress || '',
                ).toLowerCase()
                return (
                  <TokenRow
                    key={token.id}
                    token={token}
                    pricing={pricingMap[key]}
                  />
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
