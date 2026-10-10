import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'

import type { HeldToken } from '@/hooks/use-held-tokens'
import { formatDecimal, formatTokenAmount } from '@/lib/format'
import { formatAddress } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

export interface HeldTokenCardProps {
  token: HeldToken
}

export const HeldTokenCard: React.FC<HeldTokenCardProps> = ({ token }) => {
  const name = token.name.trim() || token.symbol.trim() || formatAddress(token.address)
  const mark = (token.symbol.trim() || name).charAt(0).toUpperCase() || '--'
  const tokenPath = `/token/${token.address}`

  return (
    <div className="flex flex-col gap-3 border border-[#484B51] px-4 py-5 text-white">
      <div className="flex min-w-0 items-center">
        <Link
          to={tokenPath}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-15 font-medium leading-[1.4] tracking-[-0.4px] text-white outline-none transition-colors hover:text-white"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D0FF00] text-10 font-semibold text-black">
            {mark}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{name}</span>
            <span className="truncate text-xs font-normal leading-[1.4] text-[#84888C]">
              {formatAddress(token.address)}
            </span>
          </span>
        </Link>
      </div>
      <div className="h-px w-full bg-[#303236]" aria-hidden="true"></div>
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <span className="text-sm font-normal leading-4.5 text-[#A0A3A7]">
            {m.me_asset_price()}
          </span>
          <span className="text-sm font-normal leading-[1.4] text-white">
            {token.priceBNB === null
              ? '--'
              : `${formatDecimal(token.priceBNB)} BNB`}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-4">
          <span className="text-sm font-normal leading-4.5 text-[#A0A3A7]">
            {m.me_asset_change_24h()}
          </span>
          <span className="text-sm font-normal leading-[1.4] text-[#84888C]">
            --
          </span>
        </div>
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm font-normal leading-4.5 text-[#A0A3A7]">
            {m.me_asset_quantity()}
          </span>
          <span className="flex min-w-0 flex-col items-end gap-0.5 text-right">
            <span className="text-sm font-normal leading-[1.4] text-white">
              {formatTokenAmount(token.balance)}
            </span>
            <span className="text-xs font-normal leading-[1.4] text-[#84888C]">
              --
            </span>
          </span>
        </div>
        <Link
          to={tokenPath}
          className="flex min-h-10.5 w-full items-center justify-center gap-1 border border-[#84888C] py-3 text-[13px] font-normal uppercase leading-[1.4] tracking-[-0.052px] text-white transition-colors hover:border-[#D0FF00] hover:text-[#D0FF00]"
        >
          {m.me_asset_buy_more()}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
