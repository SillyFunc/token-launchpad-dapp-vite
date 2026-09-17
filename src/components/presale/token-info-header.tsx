import { Coins } from 'lucide-react'

import { CardTitle, CardDescription } from '@/components/ui/card'
import { formatAddress } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

interface TokenInfoHeaderProps {
  tokenAddress: string
  token?: { name: string; symbol?: string; coinImg?: string } | null
  isLoading: boolean
  isError: boolean
}

export function TokenInfoHeader({
  tokenAddress,
  token,
  isLoading,
  isError,
}: TokenInfoHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded bg-[#2F3737]" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-24 animate-pulse rounded bg-[#2F3737]" />
          <div className="h-3 w-32 animate-pulse rounded bg-[#2F3737]" />
        </div>
      </div>
    )
  }

  if (token) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border border-[#484b51] bg-[#1a1c1e]">
          {token.coinImg ? (
            <img
              src={token.coinImg}
              alt={token.name}
              className="size-full object-cover"
            />
          ) : (
            <Coins className="size-5 text-[#FFA546]" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <CardTitle className="truncate text-sm font-bold text-white">
              {token.name}
            </CardTitle>
            {token.symbol && (
              <span className="shrink-0 rounded bg-[#FE810B]/15 px-1.5 py-0.5 text-xs font-semibold text-[#FFA546]">
                {token.symbol}
              </span>
            )}
          </div>
          <CardDescription className="font-mono text-xs text-neutral-400">
            {m.presale_ca({ address: formatAddress(tokenAddress) })}
          </CardDescription>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <CardTitle className="text-sm font-bold text-white">
        {m.presale_token_info()}
      </CardTitle>
      <CardDescription className="text-xs text-neutral-400">
        {!tokenAddress
          ? m.presale_no_address()
          : isError
            ? m.presale_load_error()
            : m.presale_no_token()}
      </CardDescription>
    </div>
  )
}
