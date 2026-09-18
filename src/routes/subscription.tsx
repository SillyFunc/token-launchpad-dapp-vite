import { useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  InboxIcon,
  TriangleAlertIcon,
  WalletIcon,
} from 'lucide-react'
import { useSubscriptionList } from '@/hooks/use-subscription'
import { useConnection } from 'wagmi'
import type { SubscriptionItemResponse } from '@/api/subscription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { formatAddress } from '@/lib/utils'
import { getExplorerTransactionUrl } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

const PAGE_SIZE = 10

function formatTokenAmount(amount: number, coin: string) {
  return `${Number.isFinite(amount) ? amount : '--'}${coin ? ` ${coin}` : ''}`
}

function SubscriptionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm text-foreground" title={value}>
        {value || '--'}
      </dd>
    </div>
  )
}

function SubscriptionCard({ item }: { item: SubscriptionItemResponse }) {
  const transactionUrl = getExplorerTransactionUrl(item.txHash)

  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle className="text-base">
          {formatTokenAmount(item.preAmount, item.preCoin)}
        </CardTitle>
        <CardDescription>{m.subscription_receive_amount()}</CardDescription>
        <CardAction>
          <Badge variant="outline">
            {m.subscription_status({ status: item.status })}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SubscriptionDetail
            label={m.subscription_paid_amount()}
            value={formatTokenAmount(item.payAmount, item.payCoin)}
          />
          <SubscriptionDetail
            label={m.subscription_created_at()}
            value={item.createTime}
          />
          <SubscriptionDetail
            label={m.subscription_wallet_address()}
            value={formatAddress(item.address)}
          />
          <SubscriptionDetail
            label={m.subscription_contract_address()}
            value={formatAddress(item.contractAddress)}
          />
        </dl>
      </CardContent>

      <CardFooter className="justify-between gap-3 bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {m.subscription_transaction()}
        </span>
        {transactionUrl ? (
          <a
            href={transactionUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={m.subscription_view_transaction()}
            className="inline-flex min-w-0 items-center gap-1.5 text-xs text-foreground underline-offset-4 hover:underline"
          >
            <span className="truncate">{formatAddress(item.txHash)}</span>
            <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">--</span>
        )}
      </CardFooter>
    </Card>
  )
}

export const SubscriptionPage = () => {
  const { address } = useConnection()
  const [pageNo, setPageNo] = useState(1)

  const query = useSubscriptionList({
    address,
    pageNo,
    pageSize: PAGE_SIZE,
  })

  const subscriptions = query.data?.content ?? []
  const totalPages = Math.max(query.data?.totalPages ?? 1, 1)

  let content: React.ReactNode

  if (!address) {
    content = (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WalletIcon />
          </EmptyMedia>
          <EmptyTitle>{m.connect_wallet()}</EmptyTitle>
          <EmptyDescription>
            {m.subscription_connect_wallet_description()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  } else if (query.isLoading) {
    content = (
      <Empty className="min-h-72 border" aria-live="polite">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner
              className="size-6"
              aria-label={m.subscription_loading()}
            />
          </EmptyMedia>
          <EmptyTitle>{m.subscription_loading()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  } else if (query.isError) {
    content = (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>{m.subscription_error_title()}</EmptyTitle>
          <EmptyDescription>
            {m.subscription_error_description()}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? <Spinner data-icon="inline-start" /> : null}
            {m.retry()}
          </Button>
        </EmptyContent>
      </Empty>
    )
  } else if (subscriptions.length === 0) {
    content = (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon />
          </EmptyMedia>
          <EmptyTitle>{m.subscription_empty_title()}</EmptyTitle>
          <EmptyDescription>
            {m.subscription_empty_description()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  } else {
    content = (
      <>
        <ul className="grid gap-3 lg:grid-cols-2">
          {subscriptions.map((item) => (
            <li key={item.id}>
              <SubscriptionCard item={item} />
            </li>
          ))}
        </ul>

        <footer className="flex items-center justify-between gap-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {m.pagination_page({ page: pageNo, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageNo <= 1 || query.isFetching}
              onClick={() => setPageNo((current) => Math.max(1, current - 1))}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              {m.pagination_previous()}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                query.data?.last || query.isPlaceholderData || query.isFetching
              }
              onClick={() => setPageNo((current) => current + 1)}
            >
              {m.pagination_next()}
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </footer>
      </>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {m.subscription_page_title()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {m.subscription_page_description()}
          </p>
        </div>
        {query.isFetching && !query.isLoading ? (
          <div
            className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <Spinner aria-label={m.subscription_loading()} />
            <span>{m.subscription_loading()}</span>
          </div>
        ) : null}
      </header>

      <div className="flex flex-col gap-4">{content}</div>
    </section>
  )
}
