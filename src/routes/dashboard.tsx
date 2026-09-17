import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ConnectKitButton } from 'connectkit'
import {
  CoinsIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  WalletIcon,
} from 'lucide-react'
import { useConnection } from 'wagmi'

import { TokenCard } from '@/components/dashboard/token-card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useBoardList } from '@/hooks/use-board'
import { m } from '@/paraglide/messages.js'

export const DashboardPage = () => {
  const { address } = useConnection()
  const navigate = useNavigate()
  const { data, isLoading, isError, isFetching, refetch } = useBoardList(
    { model: 0, address },
    { enabled: Boolean(address) },
  )
  const tokenList = data?.content ?? []

  return (
    <div className="relative mx-auto flex w-full flex-col pb-24 pt-6 text-white">
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageTitle
          title={m.dashboard_page_title()}
          description={m.dashboard_page_description()}
        />
        {address && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading || isFetching}
            className="cursor-pointer border-[#484b51] bg-[#131516] text-xs text-neutral-300 hover:bg-white/10"
          >
            <RefreshCwIcon
              className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{m.dashboard_refresh()}</span>
          </Button>
        )}
      </div>

      {!address && <ConnectWalletEmptyState />}

      {address && isLoading && <DashboardLoadingState />}

      {address && !isLoading && isError && (
        <EmptyState
          icon={
            <TriangleAlertIcon
              className="size-7 text-red-400"
              aria-hidden="true"
            />
          }
          title={m.dashboard_load_error()}
          description={m.dashboard_load_error_description()}
          actionLabel={m.dashboard_reload()}
          onAction={() => void refetch()}
        />
      )}

      {address && !isLoading && !isError && tokenList.length === 0 && (
        <EmptyState
          icon={<CoinsIcon className="size-7" aria-hidden="true" />}
          title={m.dashboard_empty_title()}
          description={m.dashboard_empty_description()}
          actionLabel={m.dashboard_create_first()}
          actionHref="/launch"
        />
      )}

      {address && !isLoading && !isError && tokenList.length > 0 && (
        <div className="flex flex-col gap-4">
          {tokenList.map((token) => (
            <TokenCard
              key={token.id || token.coinContractAddress || token.contractAddress}
              token={token}
              onEdit={(item) => navigate(`/launch?id=${item.id}`)}
              onPresale={(item, tokenAddress, options) =>
                navigate(`/presale?address=${tokenAddress}&id=${item.id}`, {
                  state: options?.allowEditAfterRelaunch
                    ? { allowEditAfterRelaunch: true }
                    : undefined,
                })
              }
              onView={(tokenAddress) => navigate(`/token/${tokenAddress}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ConnectWalletEmptyState() {
  return (
    <Empty className="rounded-lg border border-[#484b51] bg-[#131516] p-12">
      <EmptyHeader>
        <EmptyMedia className="mb-4 flex size-14 items-center justify-center rounded-full bg-[#FE810B]/10 text-[#FE810B]">
          <WalletIcon className="size-7" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-base font-bold text-white">
          {m.dashboard_connect_title()}
        </EmptyTitle>
        <EmptyDescription className="max-w-sm text-xs text-neutral-400">
          {m.dashboard_connect_description()}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ConnectKitButton.Custom>
          {({ show }) => (
            <Button
              type="button"
              onClick={show}
              className="cursor-pointer rounded-md border border-[#FE810B] bg-[#FD810B1A] px-6 py-2 text-sm font-semibold text-white hover:bg-[#FD810B33]"
            >
              {m.connect_wallet()}
            </Button>
          )}
        </ConnectKitButton.Custom>
      </EmptyContent>
    </Empty>
  )
}

function DashboardLoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex flex-col gap-4 border border-[#2F3737] bg-[#131516] p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 bg-neutral-800" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-24 bg-neutral-800" />
              <Skeleton className="h-3 w-36 bg-neutral-800" />
            </div>
          </div>
          <Skeleton className="h-12 bg-neutral-800/60" />
          <Skeleton className="h-16 bg-neutral-800/40" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: ReactNode
  title: string
  description: string
  actionLabel: string
  actionHref?: string
  onAction?: () => void
}) {
  return (
    <Empty className="rounded-lg border border-[#484b51] bg-[#131516] p-12">
      <EmptyHeader>
        <EmptyMedia className="mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-800 text-neutral-400">
          {icon}
        </EmptyMedia>
        <EmptyTitle className="text-base font-bold text-white">{title}</EmptyTitle>
        <EmptyDescription className="max-w-sm text-xs text-neutral-400">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {actionHref ? (
          <Link
            to={actionHref}
            className="cursor-pointer rounded-md bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] px-6 py-2 text-sm font-semibold text-white shadow-[0_3px_0_0_#963000] transition-all active:translate-y-0.5"
          >
            {actionLabel}
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAction}
            className="rounded border-[#484b51] bg-[#1a1c1e] text-xs text-white"
          >
            {actionLabel}
          </Button>
        )}
      </EmptyContent>
    </Empty>
  )
}
