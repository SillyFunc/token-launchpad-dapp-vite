import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import {
  Check,
  Coins,
  Copy,
  InboxIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import { getTokenByContractAddress } from '@/api/token'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { usePresaleList, type PresaleListItem } from '@/hooks/use-presale-list'
import { PageTitle } from '@/components/common/page-title'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { formatBnbAmount, formatDateTime, formatDecimal } from '@/lib/format'
import { tokenAmountToBnb } from '@/lib/presale-price'
import { cn, formatAddress } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

export interface PresaleDetailProps {
  label: string
  value: string
}

const PresaleDetail: React.FC<PresaleDetailProps> = ({ label, value }) => {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm text-foreground" title={value}>
        {value}
      </dd>
    </div>
  )
}

export interface CornerBracketProps {
  className?: string
}

/** The thin "[" used around the CA on the token page; mirror it with `-scale-x-100`. */
const CornerBracket: React.FC<CornerBracketProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 4.5 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('h-3 shrink-0 text-[#A0A3A7]', className)}
    >
      <path d="M4.25 0.5H0.5V13.5H4.25" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export interface ExpandableDescriptionProps {
  text: string
}

/**
 * One line with an ellipsis. The expand toggle only appears when the text is
 * actually cut off, so short descriptions don't get a useless button.
 */
const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  text,
}) => {
  const textRef = useRef<HTMLParagraphElement>(null)
  const textId = useId()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = textRef.current
    // Only measurable while clamped. The last result is kept while expanded so
    // the collapse button stays visible.
    if (!element || isExpanded) return

    // A new observer reports the current size right away, so this also
    // re-measures when the text changes but the box size does not.
    const observer = new ResizeObserver(() => {
      setIsTruncated(element.scrollHeight - element.clientHeight > 1)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [text, isExpanded])

  return (
    <div className="flex min-w-0 items-end gap-2 text-xs leading-[1.4] mt-1.5">
      <p
        ref={textRef}
        id={textId}
        className={cn(
          'min-w-0 flex-1 wrap-break-word text-[#A0A3A7]',
          !isExpanded && 'line-clamp-1',
        )}
      >
        {text}
      </p>
      {isTruncated ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={textId}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="shrink-0 text-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          {isExpanded ? m.presale_list_collapse() : m.presale_list_expand()}
        </button>
      ) : null}
    </div>
  )
}

const NewPresaleCard: React.FC<PresaleCardProps> = ({ item }) => {
  // Logo and description come from the backend token detail, like on the
  // token page. Same key and lowercase address, so opening the token reuses
  // this cache entry.
  const { data: token } = useQuery({
    queryKey: ['tokenDetail', item.tokenAddress.toLowerCase()],
    queryFn: ({ signal }) =>
      getTokenByContractAddress(item.tokenAddress.toLowerCase(), signal),
    staleTime: 30_000,
  })
  const { copy, copiedText } = useCopyToClipboard()
  const copied = copiedText === item.tokenAddress
  // Same fallback chain as the dashboard card. Nothing is shown while the
  // detail is loading or failed, so the "no description" text never flashes.
  const description = token
    ? token.meta ||
      token.zhIntroduction ||
      token.enIntroduction ||
      m.token_no_description()
    : ''
  // The contract caps each wallet in tokens; show it in BNB like the caps
  // above and the token page. A failed read comes back as 0n.
  const walletLimitText =
    item.maxBuyPerWallet > 0n && item.presalePrice > 0n
      ? formatBnbAmount(
          tokenAmountToBnb(item.maxBuyPerWallet, item.presalePrice),
        )
      : '--'

  return (
    <div className="border border-[#484B51] flex flex-col px-4 py-5 bg-[#070808]">
      {/* items-start keeps the avatar beside the symbol when the description expands. */}
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-16 bg-[#141517] after:border-foreground/10">
          <AvatarImage src={token?.coinImg || undefined} alt={item.name} />
          <AvatarFallback className="bg-[#141517]">
            <Coins className="size-8 text-[#FFA546]" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3
              className="max-w-[58%] shrink-0 truncate text-sm font-semibold leading-[1.4] text-white"
              title={item.symbol}
            >
              ${item.symbol}
            </h3>
            <span
              className="min-w-0 truncate text-xs leading-[1.4] text-[#A0A3A7]"
              title={item.name}
            >
              {item.name}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1 text-xs font-normal">
            <CornerBracket />
            <div className="mx-1 flex min-w-0 items-center">
              <span className="mr-1 shrink-0 text-[#A0A3A7]">
                {m.board_card_ca()}
              </span>
              <button
                type="button"
                title={item.tokenAddress}
                aria-label={m.token_copy_address()}
                onClick={() => void copy(item.tokenAddress)}
                className="inline-flex min-w-0 items-center gap-1 text-foreground underline underline-offset-2 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
              >
                <span className="truncate">
                  {formatAddress(item.tokenAddress)}
                </span>
                {copied ? (
                  <Check
                    className="ml-1 size-3 shrink-0 text-[#0ECB81]"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="ml-1 size-3 shrink-0" aria-hidden="true" />
                )}
              </button>
            </div>
            <CornerBracket className="-scale-x-100" />
          </div>
          {description ? <ExpandableDescription text={description} /> : null}
        </div>
      </div>
      <div className='flex flex-col gap-1.5 mt-1.5'>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,160px)] items-center gap-4 text-xs font-normal leading-[1.4]">
        <span className="min-w-0 truncate text-[#A0A3A7]">硬顶</span>
        <span className="min-w-0 overflo-hidden truncate text-right">
          {formatBnbAmount(item.hardcap)}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,160px)] items-center gap-4 text-xs font-normal leading-[1.4]">
        <span className="min-w-0 truncate text-[#A0A3A7]">软顶</span>
        <span className="min-w-0 overflo-hidden truncate text-right">
          {formatBnbAmount(item.softCap)}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,160px)] items-center gap-4 text-xs font-normal leading-[1.4]">
        <span className="min-w-0 truncate text-[#A0A3A7]">购买上限</span>
        <span className="min-w-0 overflo-hidden truncate text-right">
          {walletLimitText}
        </span>
      </div>
      </div>
      <button type="button" className="bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] shadow-[0_3px_0_0_#963000] text-base text-[#1a1a1a] h-9 font-semibold mt-4 active:translate-y-0.5 transition-all focus-visible:outline-none">
        我要认购
      </button>
    </div>
  )
}

export interface PresaleCardProps {
  item: PresaleListItem
}

const PresaleCard: React.FC<PresaleCardProps> = ({ item }) => {
  const hasHardcap = item.hardcap > 0n
  const progress = hasHardcap
    ? Math.min(100, Number((item.raised * 10_000n) / item.hardcap) / 100)
    : null
  const raisedText = hasHardcap
    ? `${formatBnbAmount(item.raised)} / ${formatBnbAmount(item.hardcap)}`
    : formatBnbAmount(item.raised)

  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{item.name}</CardTitle>
        <CardDescription>{item.symbol}</CardDescription>
        <CardAction>
          <Badge variant="outline">
            {item.stage === 'upcoming'
              ? m.presale_list_status_upcoming()
              : m.presale_list_status_open()}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              {m.presale_list_raised()}
            </span>
            <span className="tabular-nums text-foreground">{raisedText}</span>
          </div>
          {progress !== null ? <Progress value={progress} /> : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <PresaleDetail
            label={m.presale_price()}
            value={`${formatDecimal(formatEther(item.presalePrice))} ${m.presale_price_unit()}`}
          />
          <PresaleDetail
            label={m.presale_softcap()}
            value={formatBnbAmount(item.softCap)}
          />
          <PresaleDetail
            label={m.presale_list_starts()}
            value={
              item.startTime > 0n
                ? formatDateTime(item.startTime)
                : m.presale_list_start_now()
            }
          />
          <PresaleDetail
            label={m.presale_list_ends()}
            value={formatDateTime(item.endTime)}
          />
        </dl>
      </CardContent>

      <CardFooter className="justify-between gap-3 bg-muted/30">
        <span
          className="min-w-0 truncate text-xs text-muted-foreground"
          title={item.creator}
        >
          {m.presale_list_creator()} {formatAddress(item.creator)}
        </span>
        <Link
          to={`/token/${item.tokenAddress}`}
          className="shrink-0 text-xs text-foreground underline-offset-4 hover:underline"
        >
          {m.presale_list_view_token()}
        </Link>
      </CardFooter>
    </Card>
  )
}

export const PresaleListPage = () => {
  const query = usePresaleList()
  const presales = query.data ?? []

  let content: React.ReactNode

  if (query.isLoading) {
    content = (
      <Empty className="min-h-72 border" aria-live="polite">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner className="size-6" aria-label={m.presale_list_loading()} />
          </EmptyMedia>
          <EmptyTitle>{m.presale_list_loading()}</EmptyTitle>
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
          <EmptyTitle>{m.presale_list_error_title()}</EmptyTitle>
          <EmptyDescription>
            {m.presale_list_error_description()}
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
  } else if (presales.length === 0) {
    content = (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon />
          </EmptyMedia>
          <EmptyTitle>{m.presale_list_empty_title()}</EmptyTitle>
          <EmptyDescription>
            {m.presale_list_empty_description()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  } else {
    content = (
      <ul className="grid grid-cols-1 gap-3">
        {presales.map((item) => (
          <li key={item.tokenAddress}>
            <NewPresaleCard item={item} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="mx-auto flex w-full flex-1 flex-col gap-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <PageTitle
          title={m.presale_list_page_title()}
          description={m.presale_list_page_description()}
        />
        {query.isFetching && !query.isLoading ? (
          <div
            className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <Spinner aria-label={m.presale_list_loading()} />
            <span>{m.presale_list_loading()}</span>
          </div>
        ) : null}
      </header>

      <div className="flex flex-col gap-4">{content}</div>
    </section>
  )
}
