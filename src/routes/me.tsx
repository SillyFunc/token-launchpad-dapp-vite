import { useState } from 'react'
import { useConnection, useReadContract } from 'wagmi'
import { zeroAddress } from 'viem'
import { ArrowRight, Check, Copy, Pencil, Share2 } from 'lucide-react'

import { PageTitle } from '@/components/common/page-title'
import { getCoordinatorFactory } from '@/contracts'
import { formatAddress } from '@/lib/utils'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'

export const MePage = () => {
  const { address } = useConnection()
  const [copied, setCopied] = useState(false)
  const coordinator = getCoordinatorFactory()
  const { data: createdCount } = useReadContract({
    ...coordinator,
    chainId: PLATFORM_CHAIN_ID,
    functionName: 'getCreatorTokenCount',
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address) },
  })
  const shortAddress = formatAddress(address)
  const createdTokenCount =
    address && createdCount !== undefined ? createdCount.toString() : '--'

  const handleCopyAddress = async () => {
    if (!address || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2_000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="h-full pt-6 flex flex-col">
      <PageTitle title="我的主页" />
      <div className="relative bg-transparent mt-4">
        <div aria-hidden>
          <span className="pointer-events-none absolute left-0 top-0 z-10 h-4 w-4 border-l-2 border-t-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute right-0 top-0 z-10 h-4 w-4 border-r-2 border-t-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-4 w-4 border-b-2 border-l-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-4 w-4 border-b-2 border-r-2 border-[#FE810B]"></span>
        </div>
        <div className="flex flex-col gap-4 border border-[#484B51] bg-[#070808] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-[#484B51] bg-black"></div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-15 font-medium leading-[1.4] text-white">
                  {address ? `@${shortAddress}` : '--'}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 break-all text-11 leading-[1.4] text-[#84888C]">
                这个人还没有填写简介。
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-3">
              <button
                type="button"
                onClick={() => void handleCopyAddress()}
                disabled={!address}
                className="flex h-8 min-w-0 items-center justify-center gap-2 border border-[#484B51] px-3 text-13 font-medium text-white transition-colors hover:border-[#D9FF33] hover:text-[#D9FF33] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {shortAddress}
                {copied ? (
                  <Check className="size-4 shrink-0" />
                ) : (
                  <Copy className="size-4 shrink-0" />
                )}
              </button>
              <button
                type="button"
                aria-label="编辑资料"
                className="flex h-8 items-center justify-center gap-2 border border-[#484B51] px-3 text-13 font-medium text-white transition-colors hover:border-[#D9FF33] hover:text-[#D9FF33] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pencil className="size-4" />
                编辑资料
              </button>
              <button
                type="button"
                aria-label="分享个人主页"
                title="分享个人主页"
                className="flex h-8 w-8 items-center justify-center border border-[#484B51] text-white transition-colors hover:border-[#D9FF33] hover:text-[#D9FF33] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D0FF00]"
              >
                <Share2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              资产总值
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              --
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>--</span>
              <span className="ml-2">24小时</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              持有代币
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              --
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>个代币</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0 min-h-20 py-3">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              创建代币
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              {createdTokenCount}
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>个代币</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-1 flex-col pt-5">
        <div className="bg-[#070808] [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 border border-[#484B51] px-4 py-5 text-white">
              <div className="flex min-w-0 items-center">
                <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-15 font-medium leading-[1.4] tracking-[-0.4px] text-white">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D0FF00] text-10 font-semibold text-black">
                    --
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">--</span>
                    <span className="truncate text-xs font-normal leading-[1.4] text-[#84888C]">
                      --
                    </span>
                  </span>
                </div>
              </div>
              <div className="h-px w-full bg-[#303236]" aria-hidden="true"></div>
              <div className="flex flex-col gap-3">
                <div className="flex min-w-0 items-center justify-between gap-4">
                  <span className="text-sm font-normal leading-4.5 text-[#A0A3A7]">
                    價格
                  </span>
                  <span className="text-sm font-normal leading-[1.4] text-white">
                    --
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-4">
                  <span className="text-sm font-normal leading-4.5 text-[#A0A3A7]">
                    24小時變化
                  </span>
                  <span className="text-sm font-normal leading-[1.4] text-[#84888C]">
                    --
                  </span>
                </div>
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <span className="text-sm font-normal leading-4.5 text-[#A0A3A7]">
                    數量
                  </span>
                  <span className="flex min-w-0 flex-col items-end gap-0.5 text-right">
                    <span className="text-sm font-normal leading-[1.4] text-white">
                      --
                    </span>
                    <span className="text-xs font-normal leading-[1.4] text-[#84888C]">
                      --
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  disabled
                  className="flex min-h-10.5 w-full items-center justify-center gap-1 border border-[#84888C] py-3 text-[13px] font-normal uppercase leading-[1.4] tracking-[-0.052px] text-white transition-colors hover:border-[#D0FF00] hover:text-[#D0FF00] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  买入更多
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
