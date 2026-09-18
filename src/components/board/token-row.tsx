import { useNavigate } from 'react-router'
import { formatUnits } from 'viem'
import { Coins } from 'lucide-react'

import type { BoardItemResponse } from '@/api/board'
import type {
  BoardStage,
  BoardTokenPricing,
} from '@/hooks/use-board-pricing'
import { m } from '@/paraglide/messages.js'

export interface TokenRowProps {
  token: BoardItemResponse
  pricing?: BoardTokenPricing
}

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
  } = pricing ?? {}

  // Pool TVL (both sides combined) below 1 BNB is treated as low liquidity.
  const isLowLiquidity =
    stage === 'live' &&
    bnbReserve !== null &&
    Number(formatUnits(bnbReserve, 18)) * 2 < 1

  const statusMeta = STATUS_META[stage]

  const isPositive = changePercent !== null && changePercent >= 0
  const changeText =
    changePercent !== null
      ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`
      : '--'

  return (
    <div
      onClick={() => {
        if (tokenAddress) {
          navigate(`/token/${tokenAddress}`)
        }
      }}
      className="flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/5 cursor-pointer"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/30 bg-[#1a1c1e]">
          {token.coinImg ? (
            <img
              src={token.coinImg}
              alt={token.name}
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <Coins className="size-4 text-[#FFA546]" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-bold leading-tight text-[#F0F0F0]">
            {token.name}
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
            <span className="ml-1 text-white/70">
              {token.buyTax}%/{token.sellTax}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="w-14 text-right font-mono text-xs font-bold text-[#AAAAAA]">
          --
        </span>
        <div className="flex w-20 justify-end">
          <span
            className={`inline-flex items-center justify-center h-7 px-1 text-xs font-medium leading-none ${
              isPositive
                ? 'bg-[#2bc235] text-white'
                : changePercent !== null
                  ? 'bg-[#ff4a55] text-white'
                  : 'bg-neutral-800 text-neutral-500'
            }`}
          >
            {changeText}
          </span>
        </div>
      </div>
    </div>
  )
}