import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { isAddress, type Address } from 'viem'
import { useConfig, useConnection } from 'wagmi'
import { readContract } from 'wagmi/actions'

import { getTokenByContractAddress } from '@/api/token'
import {
  Check,
  ChevronDown,
  ExternalLink,
  Flame,
  Gift,
  Landmark,
  Waves,
} from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { dividendAbi } from '@/contracts'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useDividendInfo } from '@/hooks/use-dividend-info'
import { useTaxProcessor } from '@/hooks/use-tax-processor'
import { useTaxChannelYields } from '@/hooks/use-tax-channel-yields'
import { useTokenGate } from '@/hooks/use-token-gate'
import { useWriteContractTx } from '@/hooks/use-contract-tx'
import { getContractErrorMessage } from '@/lib/contract-error'
import { formatBnbAmount, formatDecimal, formatTokenAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import { formatAddress } from '@/lib/utils'
import { PLATFORM_CHAIN_ID, WRAPPED_NATIVE_ADDRESS, getExplorerAddressUrl } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

// const SWITCH_CLASS =
// '!h-6 !w-[38px] rounded-none! border-[#484B51] bg-[#18191B] p-[4px] data-checked:border-[#5B31FF] data-checked:bg-[#5B31FF] data-unchecked:bg-[#18191B] focus-visible:ring-1 focus-visible:ring-[#5B31FF] focus-visible:ring-offset-0 [&>[data-slot=switch-thumb]]:!h-[14px] [&>[data-slot=switch-thumb]]:!w-[14px] [&>[data-slot=switch-thumb]]:rounded-none [&>span]:shadow-none [&>span[data-checked]]:!translate-x-[14px] [&>span[data-checked]]:bg-white [&>span[data-unchecked]]:!translate-x-0 [&>span[data-unchecked]]:bg-white'

/**
 * Claims the connected wallet's dividends as native BNB (`withdrawDividends()` unwraps
 * WBNB). Disabled when no wallet is connected or nothing is claimable.
 */
const ClaimDividendButton: React.FC<{
  dividendAddress: Address | undefined
  account: Address | undefined
  claimable: bigint | undefined
}> = ({ dividendAddress, account, claimable }) => {
  const config = useConfig()
  const queryClient = useQueryClient()
  const { execute } = useWriteContractTx()
  const [isClaiming, setIsClaiming] = useState(false)

  const disabled =
    !dividendAddress || !account || claimable === undefined || claimable === 0n

  const handleClaim = async () => {
    if (!account || !dividendAddress || isClaiming) return
    setIsClaiming(true)
    try {
      // Re-read the live amount so a stale figure never reaches the chain.
      const live = await readContract(config, {
        address: dividendAddress,
        abi: dividendAbi,
        chainId: PLATFORM_CHAIN_ID,
        functionName: 'withdrawableDividendOf',
        args: [account],
      })
      if (live === 0n) {
        toast.error(m.me_asset_claim_empty())
        return
      }
      await execute({
        address: dividendAddress,
        abi: dividendAbi,
        functionName: 'withdrawDividends',
      })
      await queryClient.invalidateQueries({ queryKey: ['readContracts'] })
      toast.success(m.me_asset_claim_success())
    } catch (error) {
      toast.error(m.token_transaction_failed(), getContractErrorMessage(error))
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <Web3ActionButton
      type="button"
      loading={isClaiming}
      loadingText={m.me_asset_claiming()}
      disabled={disabled}
      onAction={handleClaim}
      className="inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none h-8 w-full bg-[#D0FF00] px-3 py-1.5 text-11 font-medium uppercase text-[#070808] hover:bg-[#E2FF4F] disabled:bg-[#536600] disabled:text-[#070808] disabled:opacity-100"
    >
      {m.me_asset_claim_dividend()}
    </Web3ActionButton>
  )
}

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
  const taxYields = useTaxChannelYields(tokenAddress ? [tokenAddress] : [])
  const taxYield = tokenAddress
    ? taxYields.byAddress[tokenAddress.toLowerCase()]
    : undefined
  // marketAddress is where the market channel's share goes: the creator's fee
  // recipient, or the buyback vault for vault tokens.
  const { quoteToken, marketAddress } = useTaxProcessor(tokenAddress)
  const recipientUrl = getExplorerAddressUrl(marketAddress)
  // The market channel's yield is in the quote token; show it as BNB only when the
  // quote token is WBNB, otherwise the figure would be mislabeled.
  const marketingInBnb =
    quoteToken?.toLowerCase() === WRAPPED_NATIVE_ADDRESS.toLowerCase()
      ? taxYield?.marketingBNB
      : undefined
  const { address: connectedAddress } = useConnection()
  const { info: dividendInfo, dividendAddress } = useDividendInfo(
    tokenAddress,
    connectedAddress,
  )

  const marketBps = token?.marketBps ?? 0
  const dividendBps = token?.dividendBps ?? 0
  const lpBps = token?.lpBps ?? 0
  const burnBps = token?.deflationBps ?? 0
  const hasVault = token?.buybackVaultEnabled === 1
  const showTreasury = marketBps > 0 || hasVault
  const showDividend = dividendBps > 0
  const showLiquidity = lpBps > 0
  const showBurn = burnBps > 0

  const tokenDecimals = gate.tokenDecimals
  const tokenUnit = token?.symbol ?? ''
  const tokenAmountText = (amount: bigint) =>
    tokenUnit
      ? `${formatTokenAmount(amount, tokenDecimals)} ${tokenUnit}`
      : formatTokenAmount(amount, tokenDecimals)
  const minimumShareText =
    dividendInfo?.minimumShareBalance === undefined
      ? '--'
      : tokenAmountText(dividendInfo.minimumShareBalance)
  const bnbText = (amount: bigint | undefined) =>
    amount === undefined ? '--' : formatBnbAmount(amount)
  const percentOfSupply = (amount: bigint | undefined) => {
    if (amount === undefined || gate.totalSupply <= 0n) return '--'
    const bps = Number((amount * 10_000n) / gate.totalSupply)
    return `${formatDecimal(bps / 100)}%`
  }
  const bpsPercent = (bps: number) => `${formatDecimal(bps / 100)}%`

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

  const { copy, copiedText } = useCopyToClipboard()
  const copied = Boolean(tokenAddress) && copiedText === tokenAddress

  const [treasuryOpen, setTreasuryOpen] = useState(true)
  const [dividendOpen, setDividendOpen] = useState(false)
  const [liquidityOpen, setLiquidityOpen] = useState(false)
  const [burnOpen, setBurnOpen] = useState(false)

  // const [claimForAnother, setClaimForAnother] = useState(false)
  // const [unwrapWbnb, setUnwrapWbnb] = useState(false)

  return (
    <div className="pb-3">
      <div className="flex min-w-0 items-center gap-1 text-[0.6875rem] text-xs text-[#A0A3A7] mt-2.5">
        <Link className="transition-colors hover:text-foreground" to="/board">
          {m.tax_info_breadcrumb_tokens()}
        </Link>
        <span aria-hidden>&gt;</span>
        <Link
          className="min-w-0 truncate transition-colors hover:text-foreground"
          to={tokenPath}
        >
          {tokenName}
        </Link>
        <span aria-hidden>&gt;</span>
        <span className="text-foreground">{m.tax_info_breadcrumb_current()}</span>
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
                  alt={m.tax_info_logo_alt()}
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
                    className="min-w-0 text-xs leading-[1.35] text-foreground underline decoration-white/70 underline-offset-2 hover:text-[##fe810b] truncate"
                    href={explorerUrl}
                  >
                    <span>{formatAddress(tokenAddress)}</span>
                  </a>
                  <button
                    type="button"
                    className="text-white/35 transition-colors hover:text-white/80 focus-visible:text-white/80 focus-visible:outline-none inline-flex size-3.5 shrink-0 items-center justify-center"
                    title={m.token_copy_address()}
                    aria-label={m.token_copy_address()}
                    onClick={() => void copy(tokenAddress)}
                  >
                    {copied ? (
                      <Check
                        className="size-3.5 text-[#2BC235]"
                        aria-hidden="true"
                      />
                    ) : (
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
                    )}
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
            {m.tax_info_vault_title()}
          </h2>
        </div>
        <div className="space-y-2.5">
          <div className="grid border border-[#484B51] grid-cols-2">
            <div className="flex min-h-9 items-center justify-center px-2 py-1.5 text-center text-[0.6875rem] leading-[1.35] text-[#2BC235]">
              {m.tax_info_buy_tax({
                rate: buyTax === null ? '--' : `${formatDecimal(buyTax)}%`,
              })}
            </div>
            <div className="flex min-h-9 items-center justify-center border-l border-[#484B51] px-2 py-1.5 text-center text-[0.6875rem] leading-[1.35] text-[#F7594B]">
              {m.tax_info_sell_tax({
                rate: sellTax === null ? '--' : `${formatDecimal(sellTax)}%`,
              })}
            </div>
          </div>

          {showTreasury && (
            <Collapsible
              open={treasuryOpen}
              onOpenChange={setTreasuryOpen}
              className="text-card-foreground border border-[#484B51] bg-transparent shadow-none p-2.5"
            >
              <CollapsibleTrigger
                render={<div />}
                nativeButton={false}
                className="flex min-h-5 cursor-pointer items-center justify-between gap-35"
              >
                <div className="flex min-w-0 items-center gap-1">
                  <Landmark className="size-3.5 shrink-0 text-[#7C5AFF]" />
                  <span className="min-w-0 truncate text-13 font-medium leading-[1.3] text-[#7C5AFF]">
                    {m.tax_info_treasury_title()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-13 font-medium leading-[1.3] text-[#7C5AFF]">
                    {bpsPercent(marketBps)}
                  </span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 text-[#7C5AFF] transition-transform ${treasuryOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2.5 mt-2.5">
                <div className="grid overflow-hidden border border-[#484B51] [&>*+*]:border-[#484B51] grid-cols-2 [&>*+*]:border-l [&>*+*]:border-t-0">
                  <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                    <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                      {m.tax_info_recipient_wallet()}
                    </p>
                    <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                      {marketAddress ? (
                        <a
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="break-all transition-colors hover:text-[#7C5AFF]"
                          href={recipientUrl}
                        >
                          {formatAddress(marketAddress)}
                        </a>
                      ) : (
                        '--'
                      )}
                    </div>
                  </div>
                  <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                    <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                      {m.tax_info_sent_to_recipient()}
                    </p>
                    <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                      {bnbText(marketingInBnb)}
                    </div>
                  </div>
                </div>
                <p className="text-11 leading-[1.4] text-white">
                  {m.tax_info_creator_accrual()}
                </p>
                <div className="border-t border-[#303236] pt-2.5 space-y-3">
                  <h3 className="text-base font-medium leading-[1.4] text-white">
                    {m.tax_info_recipient_info()}
                  </h3>
                  <p className="text-xs leading-[1.4] text-[#A0A3A7]">
                    {m.tax_info_recipient_description()}
                  </p>
                  <div className="flex min-h-14.5 min-w-0 flex-col justify-center border border-[#484B51] p-2">
                    <p className="mb-1 text-11 leading-[1.35] text-[#A0A3A7]">
                      {m.tax_info_recipient_address()}
                    </p>
                    <div
                      className="flex min-w-0 items-center gap-3"
                      data-testid="vault-address-row"
                    >
                      {marketAddress ? (
                        <>
                          <a
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="block min-w-0 flex-1 break-all font-mono text-xs leading-[1.35] text-white hover:text-[#D0FF00]"
                            href={recipientUrl}
                          >
                            <span>{marketAddress}</span>
                          </a>
                          <button
                            type="button"
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[#A0A3A7] transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
                            title={m.tax_info_copy_recipient()}
                            aria-label={m.tax_info_copy_recipient()}
                            onClick={() => void copy(marketAddress)}
                          >
                            {copiedText === marketAddress ? (
                              <Check
                                className="size-4 text-[#2BC235]"
                                aria-hidden="true"
                              />
                            ) : (
                              <span
                                className="relative inline-block h-4 w-4"
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
                            )}
                          </button>
                          <a
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[#A0A3A7] transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
                            aria-label={m.tax_info_view_recipient()}
                            href={recipientUrl}
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </>
                      ) : (
                        <span className="font-mono text-xs leading-[1.35] text-white">
                          --
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex min-h-13 min-w-0 items-center justify-between gap-3 border border-[#484B51] p-2">
                    <span className="text-sm leading-[1.4] text-[#A0A3A7]">
                      {m.tax_info_total_tax()}
                    </span>
                    <span className="text-sm font-medium leading-[1.4] text-white">
                      {taxYield
                        ? bnbText(
                            taxYield.marketingBNB +
                              taxYield.dividendBNB +
                              taxYield.liquidityBNB,
                          )
                        : '--'}
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {showDividend && (
            <Collapsible
              open={dividendOpen}
              onOpenChange={setDividendOpen}
              className="text-card-foreground border border-[#484B51] bg-transparent shadow-none p-2.5"
            >
              <CollapsibleTrigger
                render={<div />}
                nativeButton={false}
                className="flex min-h-5 cursor-pointer items-center justify-between gap-35"
              >
                <div className="flex min-w-0 items-center gap-1">
                  <Gift className="size-3.5 shrink-0 text-[#D0FF00]" />
                  <span className="min-w-0 truncate text-13 font-medium leading-[1.3] text-[#D0FF00]">
                    {m.dashboard_tax_channel_dividend()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-13 font-medium leading-[1.3] text-[#D0FF00]">
                    {bpsPercent(dividendBps)}
                  </span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 text-[#D0FF00] transition-transform ${dividendOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2.5 mt-2.5">
                <div className="grid overflow-hidden border border-[#484B51] [&>*+*]:border-[#484B51] grid-cols-2 [&>*+*]:border-l [&>*+*]:border-t-0">
                  <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                    <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                      {m.tax_info_dividends_distributed()}
                    </p>
                    <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                      {bnbText(taxYield?.dividendBNB)}
                    </div>
                  </div>
                  <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                    <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                      {m.tax_info_dividend_token()}
                    </p>
                    <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span>BNB</span>
                        <span className="break-all font-mono text-10 font-normal text-[#A0A3A7]">
                          {formatAddress(WRAPPED_NATIVE_ADDRESS)}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[#84888C] transition-colors hover:text-[#D0FF00] focus-visible:text-[#D0FF00] focus-visible:outline-none"
                          title={m.tax_info_copy_dividend_token()}
                          aria-label={m.tax_info_copy_dividend_token()}
                          onClick={() => void copy(WRAPPED_NATIVE_ADDRESS)}
                        >
                          {copiedText === WRAPPED_NATIVE_ADDRESS ? (
                            <Check
                              className="size-3.5 text-[#2BC235]"
                              aria-hidden="true"
                            />
                          ) : (
                            <span
                              className="relative inline-block h-3.5 w-3.5"
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
                          )}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
                {/* "为其他用户领取" switch, disabled for now:
                <div className="flex min-h-6 min-w-0 items-center justify-between gap-3">
                  <label
                    className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-0 text-xs font-medium leading-normal text-white"
                    htmlFor="claim-for-another"
                  >
                    為其他用戶領取
                  </label>
                  <Switch
                    id="claim-for-another"
                    checked={claimForAnother}
                    onCheckedChange={setClaimForAnother}
                    className={SWITCH_CLASS}
                  />
                </div>
                */}
                <p className="text-11 leading-[1.4] text-[#84888C]">
                  {m.tax_info_dividend_rules({ minimum: minimumShareText })}
                  <br />
                  <span className="block h-1" aria-hidden="true"></span>
                  {m.tax_info_dividend_wbnb_note()}
                </p>
                <div className="space-y-2.5">
                  <div
                    className="grid overflow-hidden border border-[#484B51] [&amp;&gt;*+*]:border-[#484B51] grid-cols-2 [&amp;&gt;*+*]:border-l [&amp;&gt;*+*]:border-t-0"
                    data-testid="tax-info-metric-grid"
                  >
                    <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                      <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                        {m.tax_info_claimed()}
                      </p>
                      <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                        {dividendInfo?.withdrawn === undefined
                          ? '--'
                          : bnbText(dividendInfo.withdrawn)}
                      </div>
                    </div>
                    <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                      <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                        {m.tax_info_unclaimed()}
                      </p>
                      <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                        {dividendInfo?.withdrawable === undefined
                          ? '--'
                          : bnbText(dividendInfo.withdrawable)}
                      </div>
                    </div>
                  </div>
                  {/* "解包为 BNB" switch, disabled for now (claims are native BNB):
                  <div className="flex min-h-6 min-w-0 items-center justify-between gap-3">
                    <label
                      className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-0 text-xs font-medium leading-normal text-white"
                      htmlFor="unwrap-weth"
                    >
                      解包為 BNB
                    </label>
                    <Switch
                      id="unwrap-weth"
                      checked={unwrapWbnb}
                      onCheckedChange={setUnwrapWbnb}
                      className={SWITCH_CLASS}
                    />
                  </div>
                  */}
                  <ClaimDividendButton
                    dividendAddress={dividendAddress}
                    account={connectedAddress}
                    claimable={dividendInfo?.withdrawable}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {showLiquidity && (
            <Collapsible
              open={liquidityOpen}
              onOpenChange={setLiquidityOpen}
              className="text-card-foreground border border-[#484B51] bg-transparent shadow-none p-2.5"
            >
              <CollapsibleTrigger
                render={<div />}
                nativeButton={false}
                className="flex min-h-5 cursor-pointer items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-1">
                  <Waves className="size-3.5 shrink-0 text-[#16D9D9]" />
                  <span className="min-w-0 truncate text-13 font-medium leading-[1.3] text-[#16D9D9]">
                    {m.dashboard_tax_channel_liquidity()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[#16D9D9]">
                  <span className="text-13 font-medium leading-[1.3]">
                    {bpsPercent(lpBps)}
                  </span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 transition-transform ${liquidityOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid overflow-hidden border border-[#484B51] [&>*+*]:border-[#484B51] grid-cols-2 [&>*+*]:border-l [&>*+*]:border-t-0 mt-2.5">
                <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                  <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                    {m.tax_info_liquidity_quote()}
                  </p>
                  <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                    {bnbText(taxYield?.liquidityBNB)}
                  </div>
                </div>
                <div className="flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 px-2.5 py-1.5">
                  <p className="min-w-0 text-10 leading-[1.3] text-[#A0A3A7]">
                    {m.tax_info_liquidity_tokens()}
                  </p>
                  <div className="min-w-0 text-xs font-medium leading-[1.3] text-white">
                    {taxYield
                      ? tokenAmountText(taxYield.liquidityTokens)
                      : '--'}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {showBurn && (
            <Collapsible
              open={burnOpen}
              onOpenChange={setBurnOpen}
              className="text-card-foreground border border-[#484B51] bg-transparent shadow-none p-2.5"
            >
              <CollapsibleTrigger
                render={<div />}
                nativeButton={false}
                className="flex min-h-5 cursor-pointer items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-1">
                  <Flame className="size-3.5 shrink-0 text-[#F7594B]" />
                  <span className="min-w-0 truncate text-13 font-medium leading-[1.3] text-[#F7594B]">
                    {m.tax_info_burn_title()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[#F7594B]">
                  <span className="text-13 font-medium leading-[1.3]">
                    {bpsPercent(burnBps)}
                  </span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 transition-transform ${burnOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex min-h-10 min-w-0 items-center justify-between gap-2 border border-[#484B51] px-2.5 py-1.5 mt-2.5">
                <span className="min-w-0 text-11 leading-[1.3] text-[#A0A3A7]">
                  {m.tax_info_burned_tokens()}
                </span>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-11 leading-[1.3]">
                  <span className="font-medium text-white">
                    {taxYield ? tokenAmountText(taxYield.burnedTokens) : '--'}
                  </span>
                  <span
                    className="h-3.25 w-px bg-[#484B51]"
                    aria-hidden="true"
                  ></span>
                  <span className="text-[#A0A3A7]">
                    {m.tax_info_of_max_supply({
                      percent: percentOfSupply(taxYield?.burnedTokens),
                    })}
                  </span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  )
}
