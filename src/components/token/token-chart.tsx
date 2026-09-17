import { memo } from 'react'
import { ExternalLink, LineChart, LoaderCircle } from 'lucide-react'
import type { Address } from 'viem'
import { m } from '@/paraglide/messages.js'

const KlineChart = memo(function KlineChart({ pairAddress }: { pairAddress: Address }) {
  return (
    <div className="h-120 w-full overflow-hidden rounded border border-[#2F3737] bg-[#141517]">
      <iframe
        title={m.token_chart_title()}
        src={`https://www.defined.fi/bsc/${pairAddress}/embed?hideTxTable=1&hideSidebar=1&hideChart=0&hideChartEmptyBars=1&chartSmoothing=0&embedColorMode=DEFAULT&quoteToken=token0`}
        className="size-full transition-opacity duration-200"
        allow="clipboard-write; clipboard-read"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        loading="lazy"
      />
    </div>
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
        <LoaderCircle className="size-5 animate-spin text-[#FFA546]" aria-hidden="true" />
        <span>{m.token_chart_locating_pair()}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <KlineChart pairAddress={pairAddress} />
      <a
        href={`https://pancakeswap.finance/swap?outputCurrency=${encodeURIComponent(tokenAddress)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center justify-center gap-1.5 border border-foreground/20 bg-foreground/5 px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:border-primary focus-visible:text-primary focus-visible:outline-none"
      >
        {m.token_trade_on_pancakeswap()}
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  )
}
