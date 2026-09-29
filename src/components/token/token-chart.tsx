import { memo } from 'react'
import { LineChart, LoaderCircle } from 'lucide-react'
import type { Address } from 'viem'
import { m } from '@/paraglide/messages.js'

const KlineChart = memo(function KlineChart({
  pairAddress,
}: {
  pairAddress: Address
}) {
  return (
    <iframe
      title={m.token_chart_title()}
      src={`https://www.defined.fi/bsc/${pairAddress}/embed?hideTxTable=1&hideSidebar=1&hideChart=0&hideChartEmptyBars=1&chartSmoothing=0&embedColorMode=DEFAULT&quoteToken=token0`}
      className="min-h-0 w-full flex-1 transition-opacity duration-200"
      allow="clipboard-write; clipboard-read"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      loading="lazy"
    />
  )
})

export function TokenChart({
  tokenAddress,
  pairAddress,
}: {
  tokenAddress?: Address
  pairAddress?: Address
}) {
  if (!tokenAddress) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-xs text-[#A0A3A7]">
        <LineChart className="size-6 text-[#FFA546]" aria-hidden="true" />
        <span>{m.token_chart_invalid_address()}</span>
      </div>
    )
  }

  if (!pairAddress) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-xs text-[#A0A3A7]">
        <LoaderCircle
          className="size-5 animate-spin text-[#FFA546]"
          aria-hidden="true"
        />
        <span>{m.token_chart_locating_pair()}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-[#242424] bg-[#070808] font-jetbrains text-white">
      <KlineChart pairAddress={pairAddress} />
    </div>
  )
}
