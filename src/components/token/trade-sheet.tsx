import { useState } from 'react'
import { useBalance, useConnection, useReadContract } from 'wagmi'
import { X } from 'lucide-react'
import { formatUnits, parseUnits, zeroAddress } from 'viem'

import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { flapTaxTokenV3Abi } from '@/contracts'
import type { TokenGateResult } from '@/hooks/use-token-gate'
import { useSwap } from '@/hooks/use-swap'
import { useSwapQuote, type SwapSide } from '@/hooks/use-swap-quote'
import { getContractErrorMessage } from '@/lib/contract-error'
import { formatBnbAmount, formatTokenAmount } from '@/lib/format'
import { sanitizeDecimal } from '@/lib/presale-input'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

const PERCENT_OPTIONS = [25, 50, 75, 100] as const
const BNB_GAS_RESERVE = parseUnits('0.0005', 18)

export interface TradeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gate: TokenGateResult
  symbol: string
  tradable: boolean
}

function percentAmount(value: bigint, percent: number) {
  return (value * BigInt(percent)) / 100n
}

export function TradeSheet({
  open,
  onOpenChange,
  gate,
  symbol,
  tradable,
}: TradeSheetProps) {
  const { address } = useConnection()
  const [side, setSide] = useState<SwapSide>('buy')
  const [amount, setAmount] = useState('')

  const { data: bnbBalance, refetch: refetchBnbBalance } = useBalance({
    address,
    chainId: PLATFORM_CHAIN_ID,
    query: { enabled: open && Boolean(address) },
  })
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: gate.tokenAddress,
    abi: flapTaxTokenV3Abi,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    chainId: PLATFORM_CHAIN_ID,
    query: {
      enabled: open && Boolean(address) && Boolean(gate.tokenAddress),
      refetchInterval: 15_000,
    },
  })

  const decimals = side === 'buy' ? 18 : gate.tokenDecimals
  const normalizedAmount = amount.replace(/\.$/, '')
  let parsedAmount: bigint | undefined
  if (normalizedAmount && /^\d+(\.\d+)?$/.test(normalizedAmount)) {
    try {
      parsedAmount = parseUnits(normalizedAmount, decimals)
    } catch {
      parsedAmount = undefined
    }
  }

  const quote = useSwapQuote({
    side,
    amountIn: parsedAmount,
    tokenAddress: gate.tokenAddress,
    fallbackTaxBps: side === 'buy' ? gate.buyTaxBps : gate.sellTaxBps,
  })
  const { swap, isPending, step } = useSwap()

  const balanceValue = side === 'buy' ? bnbBalance?.value : tokenBalance
  const balanceText =
    balanceValue === undefined
      ? '--'
      : side === 'buy'
        ? formatBnbAmount(balanceValue)
        : `${formatTokenAmount(balanceValue, gate.tokenDecimals)} $${symbol}`
  const insufficient =
    parsedAmount !== undefined &&
    balanceValue !== undefined &&
    parsedAmount > balanceValue

  const receiveText =
    parsedAmount === undefined
      ? '--'
      : quote.expectedOut === null
        ? quote.isLoading
          ? '...'
          : '--'
        : side === 'buy'
          ? `${formatTokenAmount(quote.expectedOut, gate.tokenDecimals)} $${symbol}`
          : formatBnbAmount(quote.expectedOut)

  const canSubmit =
    tradable &&
    parsedAmount !== undefined &&
    parsedAmount > 0n &&
    quote.minOut !== null &&
    !insufficient

  const accentBgClass =
    side === 'sell' ? 'bg-[#F7594B]' : 'bg-[#FE810B]'
  const accentHoverClass =
    side === 'sell' ? 'hover:bg-[#F7594B]/90' : 'hover:bg-[#FE810B]/90'

  const submitLabel = !tradable
    ? m.token_trade_not_live()
    : parsedAmount === undefined || parsedAmount === 0n
      ? m.token_trade_enter_amount()
      : insufficient
        ? m.token_trade_insufficient_balance()
        : side === 'buy'
          ? m.token_trade_buy()
          : m.token_trade_sell()

  const selectSide = (next: SwapSide) => {
    setSide(next)
    setAmount('')
  }

  const applyPercent = (percent: number) => {
    if (balanceValue === undefined) return

    let value = percentAmount(balanceValue, percent)
    if (side === 'buy' && percent === 100 && balanceValue > BNB_GAS_RESERVE) {
      value = balanceValue - BNB_GAS_RESERVE
    }
    setAmount(formatUnits(value, decimals))
  }

  const handleSubmit = async () => {
    if (!canSubmit || !address || parsedAmount === undefined) return
    if (quote.minOut === null || !gate.tokenAddress) return

    try {
      await swap({
        side,
        tokenAddress: gate.tokenAddress,
        amountIn: parsedAmount,
        minOut: quote.minOut,
        account: address,
      })
      toast.success(
        m.token_transaction_confirmed(),
        side === 'buy' ? m.token_trade_buy() : m.token_trade_sell(),
      )
      setAmount('')
      await Promise.all([
        gate.refetch(),
        refetchBnbBalance(),
        refetchTokenBalance(),
      ])
    } catch (error) {
      toast.error(m.token_transaction_failed(), getContractErrorMessage(error))
    }
  }

  return (
    <Drawer modal swipeDirection="down" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-transparent data-[swipe-direction=down]:border-t-transparent [--drawer-bleed-background:transparent]">
        <div className="flex flex-col items-end w-full">
          <DrawerClose
            render={
              <button
                type="button"
                aria-label={m.common_close()}
                className="grid h-8 w-8 shrink-0 place-items-center bg-[#FE810B] text-[#070808] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#FE810B]"
              />
            }
          >
            <X className="size-4 text-[#070808]" />
          </DrawerClose>
          <div className="flex min-h-0 w-full flex-col overflow-y-auto border-t border-[#FE810B] bg-[#070808] text-white">
            <header className="relative flex items-center justify-between px-6 py-5">
              <h2 className="font-jetbrains text-base font-semibold text-white">
                <span className="text-[#FE810B]">//</span>
                {m.token_trade()}
              </h2>
            </header>

            <div className="min-w-0 px-6 pb-6">
              <div className="relative grid grid-cols-2 items-center justify-center border border-[#484B51] bg-[#131516] p-2">
                {(['buy', 'sell'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectSide(value)}
                    className={cn(
                      'border border-transparent text-sm font-semibold py-1 focus-visible:outline-none',
                      side === value
                        ? `${accentBgClass} text-white`
                        : 'text-[#A0A3A7]',
                    )}
                  >
                    {value === 'buy'
                      ? m.token_trade_buy()
                      : m.token_trade_sell()}
                  </button>
                ))}
              </div>

              <div className="z-10 flex min-w-0 flex-row items-center justify-between gap-2 text-[12px] order-xs mt-4">
                <span className="min-w-0 truncate text-[#A0A3A7]">
                  {m.token_trade_balance()}:{' '}
                  <span className="text-foreground">{balanceText}</span>
                </span>
                {/* <span aria-hidden className="shrink-0 text-neutral-500">
                  <Settings2 className="size-4" />
                </span> */}
              </div>

              <div className="relative mt-2 flex items-center border border-white/20 bg-black/40 px-3">
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(event) =>
                    setAmount(sanitizeDecimal(event.target.value, decimals))
                  }
                  placeholder="0"
                  aria-label={m.token_trade_enter_amount()}
                  className="h-12 min-w-0 flex-1 bg-transparent font-jetbrains text-base text-white outline-none placeholder:text-neutral-600"
                />
                <span className="shrink-0 pl-2 font-jetbrains text-sm font-semibold text-white">
                  {side === 'buy' ? 'BNB' : `$${symbol}`}
                </span>
              </div>

              <div className="relative mt-2 grid grid-cols-4 gap-2">
                {PERCENT_OPTIONS.map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => applyPercent(percent)}
                    className="h-8 border border-white/15 text-xs text-neutral-300 transition-colors hover:border-[#FE810B] hover:text-[#FE810B] focus-visible:outline-none"
                  >
                    {percent}%
                  </button>
                ))}
              </div>

              <div className="relative mt-4 flex items-center gap-3 text-[11px] text-[#A0A3A7]">
                <span className="h-px flex-1 border-t border-dashed border-white/20" />
                <span className="shrink-0">{m.token_trade_via_dex()}</span>
                <span className="h-px flex-1 border-t border-dashed border-white/20" />
              </div>

              <div className="relative mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="shrink-0 text-[#A0A3A7]">
                  {m.token_trade_you_receive()}:
                </span>
                <span className="min-w-0 truncate text-right font-jetbrains text-white">
                  {receiveText}
                </span>
              </div>

              {/* <div className="relative mt-4 flex justify-center">
                <a
                  href="https://docs.bloxroute.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
                >
                  <span>{m.token_trade_enable_bloxroute()}</span>
                  <Info className="size-3.5" />
                </a>
              </div> */}

              <div className="relative mt-3">
                <Web3ActionButton
                  onAction={() => void handleSubmit()}
                  loading={isPending}
                  loadingText={
                    step === 'approving'
                      ? m.token_trade_approving()
                      : m.token_trade_swapping()
                  }
                  disabled={!canSubmit}
                  className={cn(
                    'h-11 w-full border-0 font-jetbrains text-base font-semibold text-white',
                    accentBgClass,
                    accentHoverClass,
                  )}
                >
                  {submitLabel}
                </Web3ActionButton>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
