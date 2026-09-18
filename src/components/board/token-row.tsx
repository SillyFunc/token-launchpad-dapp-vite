import { useNavigate } from 'react-router'
import { formatUnits } from 'viem'
import { Coins } from 'lucide-react'

import type { BoardItemResponse } from '@/api/board'
import type {
  BoardStage,
  BoardTokenPricing,
} from '@/hooks/use-board-pricing'
import { formatDecimalText } from '@/lib/format'
import { m } from '@/paraglide/messages.js'
import { TableCell, TableRow } from '@/components/ui/table'

export interface TokenRowProps {
  token: BoardItemResponse
  pricing?: BoardTokenPricing
}

/** Pairs with less than this much USD liquidity are flagged as thin. */
const LOW_LIQUIDITY_USD = 200

const STATUS_META: Record<BoardStage, { label: () => string; className: string }> = {
  live: {
    label: () => m.board_status_live(),
    className: 'bg-emerald-500/15 text-emerald-400',
  },
  presale: {
    label: () => m.board_status_presale(),
    className: 'bg-[#FFA546]/15 text-[#FFA546]',
  },
  awaiting_launch: {
    label: () => m.board_status_awaiting_launch(),
    className: 'bg-purple-500/15 text-purple-400',
  },
  failed: {
    label: () => m.board_status_failed(),
    className: 'bg-red-500/15 text-red-400',
  },
  not_launched: {
    label: () => m.board_status_not_launched(),
    className: 'bg-neutral-800 text-neutral-400',
  },
}

export function TokenRow({ token, pricing }: TokenRowProps) {
  const navigate = useNavigate()
  const tokenAddress = token.coinContractAddress || ''

  const {
    stage = 'not_launched',
    bnbReserve = null,
    changePercent = null,
    liquidityUsd = null,
  } = pricing ?? {}

  // Prefer the aggregator's USD TVL; fall back to the on-chain BNB reserve.
  // Pool TVL (both sides combined) below 1 BNB is treated as low liquidity.
  const isLowLiquidity =
    stage === 'live' &&
    (liquidityUsd !== null
      ? liquidityUsd < LOW_LIQUIDITY_USD
      : bnbReserve !== null && Number(formatUnits(bnbReserve, 18)) * 2 < 1)

  const statusMeta = STATUS_META[stage]

  const isPositive = changePercent !== null && changePercent >= 0
  const changeText =
    changePercent !== null
      ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`
      : '--'

  const handleNavigate = () => {
    if (tokenAddress) {
      navigate(`/token/${tokenAddress}`)
    }
  }

  return (
    <TableRow
      role={tokenAddress ? 'link' : undefined}
      tabIndex={tokenAddress ? 0 : undefined}
      onClick={handleNavigate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleNavigate()
        }
      }}
      className={tokenAddress ? 'cursor-pointer hover:bg-white/5' : undefined}
    >
      <TableCell className="w-[45%] px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/30 bg-[#1a1c1e]">
            {token.coinImg ? (
              <img
                src={token.coinImg}
                alt={token.name}
                className="size-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <Coins className="size-4 text-[#FFA546]" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-bold leading-tight text-[#F0F0F0]">
              {token.name}
              {token.symbol ? (
                <span className="ml-1 font-normal text-white/50">
                  ({token.symbol})
                </span>
              ) : null}
            </span>
            <div className="flex items-center gap-1 text-xs leading-normal text-white/60">
              <span
                className={`rounded px-1 py-0.5 text-xs leading-none font-medium ${statusMeta.className}`}
              >
                {statusMeta.label()}
              </span>
              {isLowLiquidity && (
                <span className="rounded bg-amber-500/15 px-1 py-0.5 text-xs text-amber-400">
                  {m.board_low_liquidity()}
                </span>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[15%] px-2 py-3 text-white/70">
        {token.buyTax}% / {token.sellTax}%
      </TableCell>
      <TableCell className="w-[25%] px-2 py-3 text-right font-mono text-[11px] font-bold text-[#AAAAAA]">
        {pricing?.priceBNB !== null && pricing?.priceBNB !== undefined
          ? formatDecimalText(pricing.priceBNB, 5)
          : '--'}
      </TableCell>
      <TableCell className="w-[15%] px-1 py-3 text-right">
        <span
          className={`inline-flex h-8 w-full min-w-0 items-center justify-center px-1 text-xs font-medium leading-none ${
            isPositive
              ? 'bg-[#2bc235] text-white'
              : changePercent !== null
                ? 'bg-[#ff4a55] text-white'
                : 'bg-neutral-800 text-neutral-500'
          }`}
        >
          {changeText}
        </span>
      </TableCell>
    </TableRow>
  )
}
