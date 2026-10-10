import { useState } from 'react'
import { useConnection, useReadContract } from 'wagmi'
import { zeroAddress } from 'viem'
import { Check, Copy, Pencil, Share2, TriangleAlertIcon } from 'lucide-react'

import { HeldTokenCard } from '@/components/me/held-token-card'
import { PageTitle } from '@/components/common/page-title'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { getCoordinatorFactory } from '@/contracts'
import { useHeldTokens } from '@/hooks/use-held-tokens'
import { formatAddress } from '@/lib/utils'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

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
  const held = useHeldTokens(address)
  const shortAddress = formatAddress(address)
  const createdTokenCount =
    address && createdCount !== undefined ? createdCount.toString() : '--'
  const heldTokenCount =
    address && held.isSuccess ? String(held.data.length) : '--'

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
    <div className="h-full py-6 flex flex-col">
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
              {heldTokenCount}
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
        <HeldTokenList
          connected={Boolean(address)}
          tokens={held.data}
          isLoading={held.isLoading}
          isError={held.isError}
          isFetching={held.isFetching}
          onRetry={() => void held.refetch()}
        />
      </div>
    </div>
  )
}

interface HeldTokenListProps {
  connected: boolean
  tokens: ReturnType<typeof useHeldTokens>['data']
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}

const HeldTokenList: React.FC<HeldTokenListProps> = ({
  connected,
  tokens,
  isLoading,
  isError,
  isFetching,
  onRetry,
}) => {
  if (!connected) {
    return (
      <Empty className="min-h-48 border border-[#484B51]">
        <EmptyHeader>
          <EmptyTitle>{m.me_assets_connect()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  if (isLoading) {
    return (
      <Empty className="min-h-48 border border-[#484B51]" aria-live="polite">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner className="size-6" aria-label={m.me_assets_loading()} />
          </EmptyMedia>
          <EmptyTitle>{m.me_assets_loading()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  if (isError) {
    return (
      <Empty className="min-h-48 border border-[#484B51]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>{m.me_assets_error()}</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            disabled={isFetching}
            onClick={onRetry}
          >
            {isFetching ? <Spinner data-icon="inline-start" /> : null}
            {m.retry()}
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (!tokens?.length) {
    return (
      <Empty className="min-h-48 border border-[#484B51]">
        <EmptyHeader>
          <EmptyDescription>{m.me_assets_empty()}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="bg-[#070808] [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="space-y-3">
        {tokens.map((token) => (
          <HeldTokenCard key={token.address} token={token} />
        ))}
      </div>
    </div>
  )
}
