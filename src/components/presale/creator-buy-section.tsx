import { useEffect, useRef, useState } from 'react'
import { useBalance } from 'wagmi'
import { formatUnits, parseEther } from 'viem'
import { ArrowLeftRight, Coins } from 'lucide-react'

import bnbIcon from '@/assets/bnb-icon.svg'
import { FormSectionTitle } from '@/components/common/form-section-title'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

export interface CreatorBuySectionProps {
  address: `0x${string}`
  poolTokenPriceBnb?: number
  creatorBuyBnb: string
  creatorBuyTokens: string
  onChangeBnb: (val: string) => void
  onChangeTokens: (val: string) => void
  maxCreatorBuyBnb?: number
  maxCreatorBuyTokens?: number
  presaleTokenPrice?: string
}

function formatCleanNumber(num: number, maxDecimals = 8): string {
  if (!Number.isFinite(num) || num <= 0) return '0'
  return String(parseFloat(num.toFixed(maxDecimals)))
}

export function CreatorBuySection({
  address,
  poolTokenPriceBnb,
  creatorBuyBnb,
  creatorBuyTokens,
  onChangeBnb,
  onChangeTokens,
  maxCreatorBuyBnb,
  maxCreatorBuyTokens,
  presaleTokenPrice,
}: CreatorBuySectionProps) {
  const hasTokens = Number(creatorBuyTokens) > 0
  const hasBnb = Number(creatorBuyBnb) > 0
  const initialMode = hasTokens ? 'TOKEN' : 'BNB'
  const [mode, setMode] = useState<'BNB' | 'TOKEN'>(initialMode)
  const [inputValue, setInputValue] = useState<string>(() => {
    if (hasTokens) return String(creatorBuyTokens)
    if (hasBnb) return String(creatorBuyBnb)
    return ''
  })
  const hasSyncedInitialRef = useRef(hasTokens || hasBnb)

  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: Boolean(address),
      staleTime: 10_000,
    },
  })

  const rawBalanceNum = balanceData
    ? Number(formatUnits(balanceData.value, balanceData.decimals))
    : 0
  const formattedBalance = rawBalanceNum.toFixed(4)
  const poolPriceNum = poolTokenPriceBnb ?? 0
  const hasPresalePrice = Number(presaleTokenPrice || 0) > 0
  const purchaseDisabled = !hasPresalePrice

  useEffect(() => {
    if (hasSyncedInitialRef.current) return

    const numTokens = Number(creatorBuyTokens) || 0
    const numBnb = Number(creatorBuyBnb) || 0

    if (numTokens > 0) {
      setMode('TOKEN')
      setInputValue(String(creatorBuyTokens))
      hasSyncedInitialRef.current = true
    } else if (numBnb > 0) {
      setMode('BNB')
      setInputValue(String(creatorBuyBnb))
      hasSyncedInitialRef.current = true
    }
  }, [creatorBuyBnb, creatorBuyTokens])

  const handleToggleMode = () => {
    if (purchaseDisabled) return
    hasSyncedInitialRef.current = true

    if (mode === 'BNB') {
      const bnbNum = Number(inputValue) || 0
      if (bnbNum > 0 && poolPriceNum > 0) {
        const tokens = formatCleanNumber(bnbNum / poolPriceNum, 4)
        setInputValue(tokens)
        onChangeTokens(tokens)
        onChangeBnb(formatCleanNumber(bnbNum, 6))
      } else {
        setInputValue('')
        onChangeTokens('0')
        onChangeBnb('0')
      }
      setMode('TOKEN')
    } else {
      const tokenNum = Number(inputValue) || 0
      if (tokenNum > 0 && poolPriceNum > 0) {
        const bnb = formatCleanNumber(tokenNum * poolPriceNum, 6)
        setInputValue(bnb)
        onChangeBnb(bnb)
        onChangeTokens('0')
      } else {
        setInputValue('')
        onChangeBnb('0')
        onChangeTokens('0')
      }
      setMode('BNB')
    }
  }

  const handleInputChange = (val: string) => {
    if (purchaseDisabled) return
    hasSyncedInitialRef.current = true
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return
    setInputValue(val)

    const num = Number(val) || 0
    if (num <= 0) {
      onChangeBnb('0')
      onChangeTokens('0')
      return
    }

    if (mode === 'BNB') {
      const clamped =
        maxCreatorBuyBnb && maxCreatorBuyBnb > 0
          ? Math.min(num, maxCreatorBuyBnb)
          : num
      onChangeBnb(String(clamped))
      onChangeTokens('0')
    } else {
      const clamped =
        maxCreatorBuyTokens && maxCreatorBuyTokens > 0
          ? Math.min(num, maxCreatorBuyTokens)
          : num
      onChangeTokens(String(clamped))
      onChangeBnb(
        poolPriceNum > 0 ? formatCleanNumber(clamped * poolPriceNum, 6) : '0',
      )
    }
  }

  const handlePercentClick = (percent: number) => {
    if (purchaseDisabled || !balanceData) return
    hasSyncedInitialRef.current = true

    if (mode === 'BNB') {
      const balanceWei = balanceData.value
      const maxBuyWei =
        maxCreatorBuyBnb && maxCreatorBuyBnb > 0
          ? parseEther(String(maxCreatorBuyBnb))
          : balanceWei
      const baseWei = balanceWei < maxBuyWei ? balanceWei : maxBuyWei
      const targetWei = (baseWei * BigInt(percent)) / 100n
      const bnbStr =
        targetWei > 0n ? formatUnits(targetWei, balanceData.decimals) : '0'
      setInputValue(bnbStr)
      onChangeBnb(bnbStr)
      onChangeTokens('0')
      return
    }

    if (
      !poolPriceNum ||
      poolPriceNum <= 0 ||
      !maxCreatorBuyTokens ||
      maxCreatorBuyTokens <= 0
    )
      return

    const walletBnb = Number(formatUnits(balanceData.value, balanceData.decimals))
    const targetBnb = (walletBnb * percent) / 100
    const targetTokens = targetBnb / poolPriceNum
    const tokens = formatCleanNumber(
      Math.min(targetTokens, maxCreatorBuyTokens),
      8,
    )
    const actualBnb = formatCleanNumber(Number(tokens) * poolPriceNum, 8)

    setInputValue(tokens)
    onChangeTokens(tokens)
    onChangeBnb(actualBnb)
  }

  const externalInputValue =
    mode === 'BNB'
      ? Number(creatorBuyBnb) > 0
        ? creatorBuyBnb
        : inputValue
      : Number(creatorBuyTokens) > 0
        ? creatorBuyTokens
        : inputValue
  const inputNum = Number(externalInputValue) || 0

  const handleInputBlur = () => {
    if (purchaseDisabled) return
    const num = Number(inputValue)
    if (!Number.isFinite(num) || num <= 0) return

    if (mode === 'BNB' && maxCreatorBuyBnb && maxCreatorBuyBnb > 0) {
      const clamped = Math.min(num, maxCreatorBuyBnb)
      setInputValue(formatCleanNumber(clamped, 6))
      onChangeBnb(formatCleanNumber(clamped, 6))
      onChangeTokens('0')
    } else if (mode === 'TOKEN' && maxCreatorBuyTokens && maxCreatorBuyTokens > 0) {
      const clamped = Math.min(num, maxCreatorBuyTokens)
      setInputValue(formatCleanNumber(clamped, 4))
      onChangeTokens(formatCleanNumber(clamped, 4))
      onChangeBnb(
        poolPriceNum > 0 ? formatCleanNumber(clamped * poolPriceNum, 6) : '0',
      )
    }
  }

  return (
    <div className="flex flex-col gap-3 text-white">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <FormSectionTitle title={m.presale_creator_buy()} />
          <span className="bg-white/10 px-1.5 py-0.5 text-[10px] text-neutral-400">
            {m.presale_optional()}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-400">
          {m.presale_creator_buy_hint()}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">{m.presale_wallet_balance()}</span>
          <span className="font-mono font-medium text-white">
            {formattedBalance} BNB
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'flex h-11 items-center justify-between border border-[#484b51] bg-[#141517] px-3 transition-colors focus-within:border-[#FE810B]',
          )}
        >
          <input
            type="text"
            inputMode="decimal"
            placeholder=""
            value={purchaseDisabled ? '' : inputValue}
            disabled={purchaseDisabled}
            onChange={(event) => handleInputChange(event.target.value)}
            onBlur={handleInputBlur}
            className="w-full bg-transparent font-mono text-sm font-medium text-white placeholder:text-neutral-500 focus:outline-none"
          />
          <div className="mx-3 h-5 w-px shrink-0 bg-white/15" />
          <button
            type="button"
            onClick={handleToggleMode}
            disabled={purchaseDisabled}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white transition-all hover:bg-white/10 hover:text-[#FFA546] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            title={m.presale_switch_input()}
          >
            {mode === 'BNB' ? (
              <>
                <img src={bnbIcon} alt="BNB" className="size-4 shrink-0" />
                <span>BNB</span>
              </>
            ) : (
              <>
                <Coins className="size-4 shrink-0 text-[#FFA546]" />
                <span>{m.presale_token_unit()}</span>
              </>
            )}
            <ArrowLeftRight className="ml-0.5 size-3 text-[#FFA546]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[25, 50, 75, 100].map((percent) => (
          <button
            key={percent}
            type="button"
            onClick={() => handlePercentClick(percent)}
            disabled={
              purchaseDisabled ||
              !balanceData ||
              (mode === 'TOKEN' &&
                (!poolPriceNum || poolPriceNum <= 0 || !maxCreatorBuyTokens))
            }
            className="flex h-8 cursor-pointer items-center justify-center border border-[#2F3737] bg-[#1a1c1e] text-xs font-semibold text-neutral-300 transition-all select-none hover:border-[#FE810B] hover:text-[#FFA546] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {percent}%
          </button>
        ))}
      </div>

      <div className="border-t border-white/5 pt-2 text-[11px] text-neutral-400">
        {mode === 'BNB' ? (
          <span>
            {m.presale_estimated_tokens()}
            <strong className="font-mono text-white">
              {poolPriceNum > 0 && inputNum > 0
                ? (inputNum / poolPriceNum).toLocaleString(undefined, {
                    maximumFractionDigits: 8,
                  })
                : '--'}
            </strong>{' '}
            {m.presale_token_unit()}
          </span>
        ) : (
          <span>
            {m.presale_estimated_bnb()}
            <strong className="font-mono text-white">
              {poolPriceNum > 0 && inputNum > 0
                ? formatCleanNumber(inputNum * poolPriceNum, 8)
                : '--'}
            </strong>{' '}
            BNB
          </span>
        )}
      </div>
    </div>
  )
}
