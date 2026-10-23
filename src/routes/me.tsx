import { ConnectKitButton } from 'connectkit'
import { useMemo } from 'react'
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
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useHeldTokens } from '@/hooks/use-held-tokens'
import { walletAvatarDataUri } from '@/lib/avatar'
import { formatAddress } from '@/lib/utils'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

export const MePage = () => {
  const { address } = useConnection()
  const { copy, copiedText } = useCopyToClipboard()
  const copied = Boolean(address) && copiedText === address
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
  const avatarSrc = useMemo(() => walletAvatarDataUri(address), [address])
  const createdTokenCount =
    address && createdCount !== undefined ? createdCount.toString() : '--'
  const heldTokenCount =
    address && held.isSuccess ? String(held.data.length) : '--'

  return (
    <div className="h-full py-6 flex flex-col">
      <PageTitle title={m.me_page_title()} />
      <div className="relative bg-transparent mt-4">
        <div aria-hidden>
          <span className="pointer-events-none absolute left-0 top-0 z-10 h-4 w-4 border-l-2 border-t-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute right-0 top-0 z-10 h-4 w-4 border-r-2 border-t-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-4 w-4 border-b-2 border-l-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-4 w-4 border-b-2 border-r-2 border-[#FE810B]"></span>
        </div>
        <div className="flex flex-col gap-4 border border-[#484B51] bg-[#070808] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-[#484B51] bg-black">
              {avatarSrc && (
                <img
                  src={avatarSrc}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-15 font-medium leading-[1.4] text-white">
                  {address ? `@${shortAddress}` : '--'}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 break-all text-11 leading-[1.4] text-[#84888C]">
                {m.me_bio_empty()}
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-3">
              {address ? (
                <>
                  <button
                    type="button"
                    onClick={() => void copy(address)}
                    disabled={!address}
                    className="flex h-8 min-w-0 items-center justify-center gap-2 border border-[#484B51] px-3 text-13 font-medium text-white transition-colors hover:border-[#fe810b] hover:text-[#fe810b] disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="flex h-8 items-center justify-center gap-2 border border-[#484B51] px-3 text-13 font-medium text-white transition-colors hover:border-[#fe810b] hover:text-[#fe810b] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    {m.me_edit_profile()}
                  </button>
                  <button
                    type="button"
                    aria-label={m.me_share_profile()}
                    title={m.me_share_profile()}
                    className="flex h-8 w-8 items-center justify-center border border-[#484B51] text-white transition-colors hover:border-[#fe810b] hover:text-[#fe810b] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#fe810b]"
                  >
                    <Share2 className="size-3.5" />
                  </button>
                </>
              ) : (
                <ConnectKitButton.Custom>
                  {({ show }) => (
                    <button
                      type="button"
                      onClick={show}
                      className="flex h-8 items-center justify-center border border-[#fe810b] bg-[#fe810b] px-3 text-13 font-semibold tracking-[-0.052px] text-[#1A1A1A] transition-colors hover:bg-[#E87000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E87000] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      {m.connect_wallet()}
                    </button>
                  )}
                </ConnectKitButton.Custom>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              {m.me_total_assets()}
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              --
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>--</span>
              <span className="ml-2">{m.me_24h()}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              {m.me_held_tokens()}
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              {heldTokenCount}
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>{m.me_token_unit()}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0 min-h-20 py-3">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              {m.me_created_tokens()}
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              {createdTokenCount}
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>{m.me_token_unit()}</span>
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
