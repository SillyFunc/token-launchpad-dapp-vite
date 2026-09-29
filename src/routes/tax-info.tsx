import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { isAddress, type Address } from 'viem'

import { getTokenByContractAddress } from '@/api/token'
import { useTokenGate } from '@/hooks/use-token-gate'
import { formatDecimal } from '@/lib/format'
import { formatAddress } from '@/lib/utils'
import { getExplorerAddressUrl } from '@/lib/web3'

export const TaxInfoPage = () => {
  const { address: routeAddress = '' } = useParams<{ address: string }>()
  const tokenAddress = isAddress(routeAddress)
    ? (routeAddress.toLowerCase() as Address)
    : undefined

  const { data: token } = useQuery({
    queryKey: ['tokenDetail', tokenAddress],
    queryFn: ({ signal }) => getTokenByContractAddress(tokenAddress!, signal),
    enabled: Boolean(tokenAddress),
    staleTime: 30_000,
  })
  const gate = useTokenGate(tokenAddress)

  const tokenName = token?.name || '--'
  const tokenSymbol = token?.symbol ? `$${token.symbol}` : '--'
  const explorerUrl = getExplorerAddressUrl(tokenAddress)
  const tokenPath = tokenAddress ? `/token/${tokenAddress}` : '/board'
  const buyTax =
    token?.buyTax ??
    (gate.buyTaxBps === undefined ? null : gate.buyTaxBps / 100)
  const sellTax =
    token?.sellTax ??
    (gate.sellTaxBps === undefined ? null : gate.sellTaxBps / 100)

  const handleCopy = () => {
    if (!tokenAddress || !navigator.clipboard) return
    void navigator.clipboard.writeText(tokenAddress).catch(() => undefined)
  }

  return (
    <>
      <div className="flex min-w-0 items-center gap-1 text-[0.6875rem] text-xs text-[#A0A3A7] mt-2.5">
        <Link className="transition-colors hover:text-foreground" to="/board">
          代币
        </Link>
        <span aria-hidden>&gt;</span>
        <Link
          className="min-w-0 truncate transition-colors hover:text-foreground"
          to={tokenPath}
        >
          {tokenName}
        </Link>
        <span aria-hidden>&gt;</span>
        <span className="text-foreground">稅收信息</span>
      </div>
      <div className="border border-[#484B51] mt-2.5">
        <div className="flex h-5 items-center border-b border-[#484B51] bg-[#010202] px-2">
          <div className="flex gap-2">
            <span
              className="flex h-2.5 w-2.5 flex-col justify-between"
              aria-hidden="true"
            >
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(247, 89, 75)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(247, 89, 75)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(247, 89, 75)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(247, 89, 75)' }}
              ></span>
            </span>
            <span
              className="flex h-2.5 w-2.5 flex-col justify-between"
              aria-hidden="true"
            >
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(254, 207, 0)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(254, 207, 0)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(254, 207, 0)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(254, 207, 0)' }}
              ></span>
            </span>
            <span
              className="flex h-2.5 w-2.5 flex-col justify-between"
              aria-hidden="true"
            >
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(43, 194, 53)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(43, 194, 53)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(43, 194, 53)' }}
              ></span>
              <span
                className="h-px w-full"
                style={{ backgroundColor: 'rgb(43, 194, 53)' }}
              ></span>
            </span>
          </div>
          <div
            className="ml-6 h-2.5 min-w-0 flex-1 bg-[repeating-linear-gradient(105deg,transparent_0,transparent_6px,#fb5f16_6px,#fb5f16_7px)]"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black)',
            }}
          ></div>
        </div>
        <div className="bg-[#131516] px-3 py-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative size-12 shrink-0">
              <span
                aria-hidden
                className="absolute size-1.5 border-white left-0 top-0 border-l border-t"
              ></span>
              <span
                aria-hidden
                className="absolute size-1.5 border-white right-0 top-0 border-r border-t"
              ></span>
              <span
                aria-hidden
                className="absolute size-1.5 border-white bottom-0 left-0 border-b border-l"
              ></span>
              <span
                aria-hidden
                className="absolute size-1.5 border-white bottom-0 right-0 border-b border-r"
              ></span>
              <div className="absolute left-1 top-1 size-10 border border-solid border-[#484B51]">
                <img
                  src={token?.coinImg || ''}
                  alt="代币LOGO"
                  loading="lazy"
                  className="size-full object-cover"
                  sizes="64px"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1 flex min-h-10 flex-col justify-center">
              <div className="flex min-w-0 gap-x-3 items-center">
                <h1 className="min-w-0 wrap-break-word text-base font-medium text-foreground">
                  {tokenSymbol}
                </h1>
                <span className="min-w-0 flex-1 text-[#84888C] truncate whitespace-nowrap text-xs">
                  {tokenName}
                </span>
              </div>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                <div className="flex min-w-0 items-center gap-1.5 text-[#A0A3A7]">
                  <span
                    aria-hidden="true"
                    className="h-3 w-1 border-y border-l border-current"
                  ></span>
                  <span className="text-xs">CA</span>
                  <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="min-w-0 text-xs leading-[1.35] text-foreground underline decoration-white/70 underline-offset-2 hover:text-[#D0FF00] truncate"
                    href={explorerUrl}
                  >
                    <span>{formatAddress(tokenAddress)}</span>
                  </a>
                  <button
                    type="button"
                    className="text-white/35 transition-colors hover:text-white/80 focus-visible:text-white/80 focus-visible:outline-none inline-flex size-3.5 shrink-0 items-center justify-center"
                    title="複製地址"
                    aria-label="複製地址"
                    onClick={handleCopy}
                  >
                    <span
                      className="relative inline-block size-3.5"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 14.834 14.834"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="none"
                        className="absolute inset-[12.92%_12.91%_12.91%_12.92%]"
                      >
                        <path
                          d="M10.7503 3.33333C10.9492 3.33333 11.1403 3.41241 11.2809 3.55306C11.4216 3.69371 11.5007 3.88475 11.5007 4.08366V14.0837C11.5007 14.4979 11.1645 14.834 10.7503 14.834H0.750326C0.336112 14.834 1.51715e-08 14.4979 0 14.0837V4.08366C4.41037e-06 3.66945 0.336115 3.33333 0.750326 3.33333H10.7503ZM1.50065 13.3333H10V4.83398H1.50065V13.3333ZM14.0837 0C14.2826 8.3105e-08 14.4736 0.0790748 14.6143 0.219727C14.7549 0.360379 14.834 0.551414 14.834 0.750326V10.7503H13.3333V1.50065H4.08366V0H14.0837Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                    </span>
                  </button>
                  <span
                    aria-hidden="true"
                    className="h-3 w-1 border-y border-r border-current"
                  ></span>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2.5 mt-2.5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h2 className="text-[0.9375rem] font-semibold uppercase leading-[1.35] text-[#EEEEEE]">
            稅收金庫信息
          </h2>
        </div>
        <div className="space-y-2.5">
          <div className="grid border border-[#484B51] grid-cols-2">
            <div className="flex min-h-9 items-center justify-center px-2 py-1.5 text-center text-[0.6875rem] leading-[1.35] text-[#2BC235]">
              買入稅率: {buyTax === null ? '--' : `${formatDecimal(buyTax)}%`}
            </div>
            <div className="flex min-h-9 items-center justify-center border-l border-[#484B51] px-2 py-1.5 text-center text-[0.6875rem] leading-[1.35] text-[#F7594B]">
              賣出稅率: {sellTax === null ? '--' : `${formatDecimal(sellTax)}%`}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
