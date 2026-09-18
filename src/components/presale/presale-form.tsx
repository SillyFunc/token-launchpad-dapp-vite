import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { useConfig, useReadContract } from 'wagmi'
import { waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import { formatEther, isAddress, parseEther, type Address } from 'viem'
import { hoursToSeconds, minutesToSeconds } from 'date-fns'
import { Calculator, Coins } from 'lucide-react'
import {
  flapTaxTokenV3Abi,
} from '@sillyfunc/launchpad-contracts'

import { updateTokenInfo, type TokenDetail } from '@/api/token'
import { FieldInfo } from '@/components/common/field-info'
import { FormSectionTitle } from '@/components/common/form-section-title'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { CreatorBuySection } from '@/components/presale/creator-buy-section'
import { FieldWrap, UnitInput } from '@/components/presale/form-fields'
import { toast } from '@/lib/toast'
import { requestAuthSignature } from '@/lib/auth'
import { getContractErrorMessage } from '@/lib/contract-error'
import { formatTokenSupply } from '@/lib/format'
import { sanitizeDecimal, sanitizeInteger } from '@/lib/presale-input'
import { calculatePresaleTokenPrice } from '@/lib/presale-price'
import { cn } from '@/lib/utils'
import { getCoordinatorFactory } from '@/lib/contracts'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

const DURATION_MIN_SEC = hoursToSeconds(1)
const DURATION_MAX_SEC = hoursToSeconds(90)
const VESTING_DELAY_MIN_SEC = minutesToSeconds(5)
const VESTING_DELAY_MAX_SEC = minutesToSeconds(30)
const START_IMMEDIATELY_SEC = 0

interface PresaleFormProps {
  token?: TokenDetail | null
  tokenAddress: string
  address: Address
}

export function PresaleForm({
  token,
  tokenAddress,
  address,
}: PresaleFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const config = useConfig()
  const coordinator = getCoordinatorFactory()
  const resolvedTokenAddress = tokenAddress || token?.coinContractAddress || ''

  const { data: totalSupplyData } = useReadContract({
    address: isAddress(resolvedTokenAddress)
      ? resolvedTokenAddress
      : undefined,
    abi: flapTaxTokenV3Abi,
    functionName: 'totalSupply',
    chainId: PLATFORM_CHAIN_ID,
    query: {
      enabled: isAddress(resolvedTokenAddress),
      staleTime: Infinity,
    },
  })
  const { data: allocationData } = useReadContract({
    ...coordinator,
    functionName: 'presaleBps',
    chainId: PLATFORM_CHAIN_ID,
    query: { staleTime: Infinity },
  })
  const { data: poolBpsData } = useReadContract({
    ...coordinator,
    functionName: 'poolBps',
    chainId: PLATFORM_CHAIN_ID,
    query: { staleTime: Infinity },
  })

  const presaleBps = allocationData == null ? 0n : BigInt(allocationData)
  const poolBps = Number(poolBpsData ?? 2000)
  const totalSupply = totalSupplyData ?? 0n
  const totalSupplyNum = Number(formatEther(totalSupply))
  const totalSupplyText =
    totalSupply > 0n ? formatTokenSupply(totalSupply) : '--'
  const presaleShare = (totalSupply * presaleBps) / 10000n
  const presaleShareNum = Number(formatEther(presaleShare))
  const presaleShareText =
    presaleShare > 0n ? formatTokenSupply(presaleShare) : '--'
  const poolShare = (totalSupply * BigInt(poolBps)) / 10000n
  const poolShareNum = Number(formatEther(poolShare))
  const maxCreatorBuyTokensNum =
    poolShare > 0n ? Number(formatEther(poolShare / 20n)) : 0

  const initialHardcap = token?.hardcap ? String(token.hardcap) : ''
  const initialSoftcap =
    token?.softcap || token?.soft ? String(token.softcap || token.soft) : ''
  const initialMaxBuyBnb = (() => {
    if (token?.maxBuyPerWallet && token?.presaleTokenPrice) {
      try {
        const maxBuyTokensWei = parseEther(String(token.maxBuyPerWallet))
        const priceWei = parseEther(String(token.presaleTokenPrice))
        if (maxBuyTokensWei > 0n && priceWei > 0n) {
          return formatEther((maxBuyTokensWei * priceWei) / 10n ** 18n)
        }
      } catch {
        return ''
      }
    }
    return ''
  })()
  const initialVestingDelayMinutes = (() => {
    const sec = Number(token?.vestingDelay) || 0
    if (sec <= 0) return '5'
    const minutes = Math.round(sec / 60)
    return String(Math.min(30, Math.max(5, minutes)))
  })()

  const formDefaultValues = {
    maxBuyBnb: initialMaxBuyBnb,
    hardcap: initialHardcap,
    softcap: initialSoftcap,
    vestingDelayMinutes: initialVestingDelayMinutes,
    vestingRate: token?.vestingRate ? Number(token.vestingRate) : 5,
    creatorBuyTokens: token?.creatorBuyTokens
      ? String(token.creatorBuyTokens)
      : '0',
    creatorBuyBnb: token?.creatorBuyBnb ? String(token.creatorBuyBnb) : '',
    durationHours: '1',
  }

  const form = useForm({
    defaultValues: formDefaultValues,
    onSubmit: async ({ value }) => {
      const hardcapNum = Number(value.hardcap || '0')
      const hardcapWei = parseEther(value.hardcap || '0')
      const softcapStr = value.softcap || '0'
      const softcapWei = parseEther(softcapStr)
      const minSoftcapWei = (hardcapWei + 1n) / 2n
      if (softcapWei < minSoftcapWei || softcapWei > hardcapWei) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_softcap_range(),
        )
        return
      }
      const minLiquidityWei = softcapWei
      const priceWei = calculatePresaleTokenPrice(hardcapWei, presaleShare)
      if (!priceWei) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_wait_share(),
        )
        return
      }
      const priceBNB = formatEther(priceWei)
      const maxBuyBnbWei = parseEther(value.maxBuyBnb || '0')
      const maxRaiseWei = (priceWei * presaleShare) / 10n ** 18n
      if (
        maxBuyBnbWei <= 0n ||
        maxBuyBnbWei > hardcapWei ||
        maxBuyBnbWei > maxRaiseWei
      ) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_max_buy_range(),
        )
        return
      }
      if (maxRaiseWei < softcapWei) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_price_too_low(),
        )
        return
      }
      const maxBuyWei = (maxBuyBnbWei * 10n ** 18n) / priceWei
      if (maxBuyWei <= 0n) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_max_buy_too_small(),
        )
        return
      }
      const maxBuyTokensStr = formatEther(maxBuyWei)
      const vestingDelaySec = BigInt(
        Math.round(minutesToSeconds(Number(value.vestingDelayMinutes || 0))),
      )
      if (
        vestingDelaySec < VESTING_DELAY_MIN_SEC ||
        vestingDelaySec > VESTING_DELAY_MAX_SEC
      ) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_vesting_delay(),
        )
        return
      }
      const durationSec = Math.round(
        hoursToSeconds(Number(value.durationHours || '0')),
      )
      if (durationSec < DURATION_MIN_SEC || durationSec > DURATION_MAX_SEC) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_duration(),
        )
        return
      }

      const creatorBuyTokensWei = parseEther(value.creatorBuyTokens || '0')
      let creatorBuyBnbWei = parseEther(value.creatorBuyBnb || '0')
      if (creatorBuyTokensWei > 0n) {
        if (poolShare <= creatorBuyTokensWei) {
          toast.error(
            m.presale_config_failed(),
            m.presale_error_creator_buy_supply(),
          )
          return
        }
        creatorBuyBnbWei =
          (hardcapWei * creatorBuyTokensWei) / (poolShare - creatorBuyTokensWei)
      }
      const creatorBuyBnbNum = Number(formatEther(creatorBuyBnbWei))
      const maxCreatorBuyBnbAllowed = hardcapNum / 19
      if (
        maxCreatorBuyBnbAllowed > 0 &&
        creatorBuyBnbNum > maxCreatorBuyBnbAllowed + 0.0001
      ) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_creator_buy_bnb({
            amount: maxCreatorBuyBnbAllowed.toFixed(4),
          }),
        )
        return
      }
      if (poolShare > 0n && creatorBuyTokensWei > poolShare / 20n) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_creator_buy_tokens({
            amount: formatTokenSupply(poolShare / 20n),
          }),
        )
        return
      }
      if (!resolvedTokenAddress || !isAddress(resolvedTokenAddress)) {
        toast.error(
          m.presale_config_failed(),
          m.presale_error_missing_address(),
        )
        return
      }

      try {
        const auth = await requestAuthSignature(config, address)
        const setupHash = await writeContract(config, {
          ...coordinator,
          functionName: 'setupPresale',
          account: address,
          chainId: PLATFORM_CHAIN_ID,
          args: [
            resolvedTokenAddress,
            {
              presaleTokenPrice: priceWei,
              maxBuyPerWallet: maxBuyWei,
              hardcap: hardcapWei,
              minLiquidityAmount: minLiquidityWei,
              softCap: softcapWei,
              startTime: BigInt(START_IMMEDIATELY_SEC),
              duration: BigInt(durationSec),
              vestingDelay: vestingDelaySec,
              vestingRate: BigInt(Number(value.vestingRate || 5)),
              slippage: 0n,
              creatorBuyTokens: creatorBuyTokensWei,
            },
          ],
          value: creatorBuyBnbWei > 0n ? creatorBuyBnbWei : undefined,
        })
        await waitForTransactionReceipt(config, {
          hash: setupHash,
          chainId: PLATFORM_CHAIN_ID,
        })

        await updateTokenInfo({
          id: token?.id ?? '',
          name: token?.name ?? '',
          coinImg: token?.coinImg ?? '',
          symbol: token?.symbol ?? '',
          meta: token?.meta || token?.zhIntroduction || '',
          buyTax: token?.buyTax ?? 0,
          sellTax: token?.sellTax ?? 0,
          feeRecipient: token?.feeRecipient || address,
          taxDuration: Number(token?.taxDuration) || 30,
          antiFarmerDuration: Number(token?.antiFarmerDuration) || 0,
          liqExpectedOutputAmount: 0,
          launchType: Number(token?.launchType) || 2,
          website: token?.website ?? '',
          telegram: token?.telegram ?? '',
          twitter: token?.twitter ?? '',
          presaleTokenPrice: priceBNB,
          maxBuyPerWallet: maxBuyTokensStr,
          hardcap: value.hardcap,
          softcap: softcapStr,
          minLiquidityAmount: softcapStr,
          startTime: START_IMMEDIATELY_SEC,
          endTime: 0,
          vestingDelay: Number(vestingDelaySec),
          vestingRate: Number(value.vestingRate) || 5,
          slippage: 0,
          creatorBuyTokens: value.creatorBuyTokens || '0',
          creatorBuyBnb: value.creatorBuyBnb || '0',
          ...auth,
        })

        toast.success(m.presale_save_success())
        void queryClient.invalidateQueries({ queryKey: ['board'] })
        navigate('/dashboard')
      } catch (err: unknown) {
        toast.error(m.presale_config_failed(), getContractErrorMessage(err))
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="flex flex-col gap-4">
        <FormSectionTitle title={m.presale_section_terms()} required />

        <form.Field
          name="hardcap"
          validators={{
            onChange: ({ value }) => {
              const n = Number(value)
              if (!value || Number.isNaN(n) || n <= 0)
                return m.presale_error_hardcap()
              return undefined
            },
          }}
        >
          {(field) => (
            <FieldWrap label={m.presale_hardcap()} required>
              <UnitInput
                id={field.name}
                name={field.name}
                inputMode="decimal"
                autoComplete="off"
                placeholder=""
                value={field.state.value}
                onChange={(event) =>
                  field.handleChange(sanitizeDecimal(event.target.value))
                }
                onBlur={field.handleBlur}
                unit="BNB"
              />
              <FieldInfo field={field} />
            </FieldWrap>
          )}
        </form.Field>

        <form.Field
          name="softcap"
          validators={{
            onChangeListenTo: ['hardcap'],
            onChange: ({ value, fieldApi }) => {
              if (!value) return m.presale_error_softcap()
              let softcapWei: bigint
              let hardcapWei: bigint
              try {
                softcapWei = parseEther(value)
                hardcapWei = parseEther(
                  fieldApi.form.getFieldValue('hardcap') || '0',
                )
              } catch {
                return m.presale_error_invalid_amounts()
              }
              if (softcapWei <= 0n) return m.presale_error_softcap()
              if (hardcapWei <= 0n) return m.presale_error_hardcap_first()
              const minSoftcapWei = (hardcapWei + 1n) / 2n
              if (softcapWei < minSoftcapWei)
                return m.presale_error_softcap_min({
                  hardcap: formatEther(hardcapWei),
                  min: formatEther(minSoftcapWei),
                })
              if (softcapWei > hardcapWei)
                return m.presale_error_softcap_max({
                  hardcap: formatEther(hardcapWei),
                })
              return undefined
            },
          }}
        >
          {(field) => (
            <form.Subscribe
              selector={(state) => Boolean(state.fieldMeta.hardcap?.isBlurred)}
            >
              {(hardcapIsBlurred) => (
                <FieldWrap label={m.presale_softcap()} required>
                  <UnitInput
                    id={field.name}
                    name={field.name}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder=""
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(sanitizeDecimal(event.target.value))
                    }
                    onBlur={field.handleBlur}
                    unit="BNB"
                  />
                  <FieldInfo
                    field={field}
                    showBeforeBlur={
                      hardcapIsBlurred &&
                      (Boolean(field.state.value) || field.state.meta.isTouched)
                    }
                  />
                </FieldWrap>
              )}
            </form.Subscribe>
          )}
        </form.Field>

        <form.Field
          name="maxBuyBnb"
          validators={{
            onChangeListenTo: ['hardcap', 'softcap'],
            onChange: ({ value, fieldApi }) => {
              if (!value) return m.presale_error_max_buy()
              let maxBuyBnbWei: bigint
              try {
                maxBuyBnbWei = parseEther(value)
              } catch {
                return m.presale_error_invalid_bnb()
              }
              if (maxBuyBnbWei <= 0n) return m.presale_error_max_buy_positive()
              let hardcapWei: bigint
              let softcapWei: bigint
              try {
                hardcapWei = parseEther(
                  fieldApi.form.getFieldValue('hardcap') || '0',
                )
                softcapWei = parseEther(
                  fieldApi.form.getFieldValue('softcap') || '0',
                )
              } catch {
                return m.presale_error_caps_first()
              }
              if (hardcapWei <= 0n) return m.presale_error_hardcap_first()
              const priceWei = calculatePresaleTokenPrice(
                hardcapWei,
                presaleShare,
              )
              if (!priceWei) return m.presale_error_share_loading()
              if (maxBuyBnbWei > hardcapWei) return m.presale_error_max_buy_hardcap()
              const maxRaiseWei = (priceWei * presaleShare) / 10n ** 18n
              if (maxRaiseWei < softcapWei) return m.presale_error_price_too_low()
              if (maxBuyBnbWei > maxRaiseWei)
                return m.presale_error_max_buy_raise()
              return undefined
            },
          }}
        >
          {(field) => (
            <form.Subscribe
              selector={(state) =>
                Boolean(
                  state.fieldMeta.hardcap?.isBlurred ||
                    state.fieldMeta.softcap?.isBlurred,
                )
              }
            >
              {(dependencyIsBlurred) => (
                <FieldWrap label={m.presale_max_buy()} required>
                  <UnitInput
                    id={field.name}
                    name={field.name}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder=""
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(sanitizeDecimal(event.target.value))
                    }
                    onBlur={field.handleBlur}
                    unit="BNB"
                  />
                  <FieldInfo
                    field={field}
                    showBeforeBlur={
                      dependencyIsBlurred &&
                      (Boolean(field.state.value) || field.state.meta.isTouched)
                    }
                  />
                </FieldWrap>
              )}
            </form.Subscribe>
          )}
        </form.Field>

        <form.Field
          name="durationHours"
          validators={{
            onChange: ({ value }) => {
              const n = Number(value)
              if (!value || Number.isNaN(n) || n <= 0)
                return m.presale_error_duration_required()
              const sec = hoursToSeconds(n)
              if (sec < DURATION_MIN_SEC || sec > DURATION_MAX_SEC)
                return m.presale_error_duration()
              return undefined
            },
          }}
        >
          {(field) => (
            <FieldWrap label={m.presale_duration()} required>
              <UnitInput
                id={field.name}
                name={field.name}
                inputMode="numeric"
                autoComplete="off"
                placeholder=""
                value={field.state.value}
                onChange={(event) =>
                  field.handleChange(sanitizeInteger(event.target.value))
                }
                onBlur={field.handleBlur}
                unit={m.presale_hours()}
              />
              <FieldInfo field={field} />
              <p className="mt-1 text-xs text-neutral-500">
                {m.presale_duration_hint()}
              </p>
            </FieldWrap>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.hardcap}>
          {(hardcap) => {
            let presaleTokenPrice = ''
            try {
              const priceWei = calculatePresaleTokenPrice(
                parseEther(hardcap || '0'),
                presaleShare,
              )
              presaleTokenPrice = priceWei ? formatEther(priceWei) : ''
            } catch {
              presaleTokenPrice = ''
            }

            return (
              <div className="flex flex-col divide-y divide-white/5 border border-[#2F3737] bg-[#181a1d] px-3.5 py-1 text-xs">
                <div className="flex h-10 items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-3.5 shrink-0 text-[#FFA546]" />
                    <span className="text-xs font-medium leading-none text-neutral-200">
                      {m.presale_total_supply()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <span
                      className="font-mono text-sm font-bold text-white"
                      title={
                        totalSupplyNum > 0
                          ? `${totalSupplyNum.toLocaleString()} ${token?.symbol || m.presale_token_unit()}`
                          : undefined
                      }
                    >
                      {totalSupplyText}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {token?.symbol || m.presale_token_unit()}
                    </span>
                  </div>
                </div>
                <div className="flex h-10 items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-3.5 shrink-0 text-[#FFA546]" />
                    <span className="text-xs font-medium leading-none text-neutral-200">
                      {m.presale_presale_supply()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <span
                      className="font-mono text-sm font-bold text-white"
                      title={
                        presaleShareNum > 0
                          ? `${presaleShareNum.toLocaleString()} ${token?.symbol || m.presale_token_unit()}`
                          : undefined
                      }
                    >
                      {presaleShareText}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {token?.symbol || m.presale_token_unit()}
                    </span>
                  </div>
                </div>
                <div className="flex h-10 items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="size-3.5 shrink-0 text-[#FFA546]" />
                    <span className="text-xs font-medium leading-none text-neutral-200">
                      {m.presale_price()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <span className="font-mono text-sm font-bold text-[#FFA546]">
                      {presaleTokenPrice || '--'}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {m.presale_price_unit()}
                    </span>
                  </div>
                </div>
              </div>
            )
          }}
        </form.Subscribe>
      </div>

      <div className="flex flex-col gap-4">
        <FormSectionTitle title={m.presale_section_vesting()} required />
        <form.Field
          name="vestingDelayMinutes"
          validators={{
            onChange: ({ value }) => {
              const n = Number(value)
              if (!value || !Number.isInteger(n) || n < 5 || n > 30)
                return m.presale_error_vesting_delay()
              return undefined
            },
          }}
        >
          {(field) => (
            <FieldWrap label={m.presale_vesting_delay()} required>
              <UnitInput
                id={field.name}
                name={field.name}
                inputMode="numeric"
                autoComplete="off"
                placeholder=""
                value={field.state.value}
                onChange={(event) =>
                  field.handleChange(sanitizeInteger(event.target.value))
                }
                onBlur={field.handleBlur}
                unit={m.presale_minutes()}
              />
              <FieldInfo field={field} />
              <p className="mt-1 text-xs text-neutral-500">
                {m.presale_vesting_delay_hint()}
              </p>
            </FieldWrap>
          )}
        </form.Field>

        <form.Field
          name="vestingRate"
          validators={{
            onChange: ({ value }) => {
              if (![5, 10, 15, 20].includes(Number(value))
              )
                return m.presale_error_vesting_rate()
              return undefined
            },
          }}
        >
          {(field) => {
            const currentVal = Number(field.state.value) || 5
            return (
              <FieldWrap label={m.presale_vesting_rate()} required>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((rate) => {
                    const isSelected = currentVal === rate
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => field.handleChange(rate)}
                        className={cn(
                          'flex h-10 cursor-pointer items-center justify-center border text-xs font-semibold transition-all select-none',
                          isSelected
                            ? 'border-[#FE810B] bg-[#FE810B]/15 text-[#FFA546]'
                            : 'border-[#2F3737] bg-[#1a1c1e] text-neutral-300 hover:border-[#FE810B]/50 hover:text-white',
                        )}
                      >
                        {rate}%
                      </button>
                    )
                  })}
                </div>
                <FieldInfo field={field} />
              </FieldWrap>
            )
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            rate: Number(state.values.vestingRate) || 5,
            delay: Number(state.values.vestingDelayMinutes) || 5,
          })}
        >
          {({ rate, delay }) => {
            const rounds = rate > 0 ? Math.ceil(100 / rate) : 0
            return (
              <div className="flex flex-col divide-y divide-white/5 border border-[#2F3737] bg-[#181a1d] px-4 py-3 text-xs">
                <div className="flex items-center justify-between pb-2.5">
                  <span className="text-neutral-400">{m.presale_rounds()}</span>
                  <span className="font-mono font-semibold text-white">
                    {m.presale_rounds_value({ count: rounds })}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2.5">
                  <span className="text-neutral-400">
                    {m.presale_round_release()}
                  </span>
                  <span className="font-mono font-semibold text-white">
                    {m.presale_round_release_value({ delay, rate })}
                  </span>
                </div>
              </div>
            )
          }}
        </form.Subscribe>
      </div>

      <div className="flex flex-col gap-4">
        <form.Subscribe
          selector={(state) => ({
            creatorBuyBnb: state.values.creatorBuyBnb,
            creatorBuyTokens: state.values.creatorBuyTokens,
            hardcap: state.values.hardcap,
          })}
        >
          {({ creatorBuyBnb, creatorBuyTokens, hardcap }) => {
            const hardcapNum = Number(hardcap || 0)
            let presaleTokenPrice = ''
            try {
              const priceWei = calculatePresaleTokenPrice(
                parseEther(hardcap || '0'),
                presaleShare,
              )
              presaleTokenPrice = priceWei ? formatEther(priceWei) : ''
            } catch {
              presaleTokenPrice = ''
            }
            const maxCreatorBuyBnb =
              hardcapNum > 0 ? Number((hardcapNum / 19).toFixed(4)) : 0
            const poolTokenPriceBnb =
              hardcapNum > 0 && poolShareNum > 0 ? hardcapNum / poolShareNum : 0

            return (
              <CreatorBuySection
                address={address}
                poolTokenPriceBnb={poolTokenPriceBnb}
                creatorBuyBnb={creatorBuyBnb}
                creatorBuyTokens={creatorBuyTokens}
                maxCreatorBuyBnb={maxCreatorBuyBnb}
                maxCreatorBuyTokens={maxCreatorBuyTokensNum}
                presaleTokenPrice={presaleTokenPrice}
                onChangeBnb={(val) => form.setFieldValue('creatorBuyBnb', val)}
                onChangeTokens={(val) =>
                  form.setFieldValue('creatorBuyTokens', val)
                }
              />
            )
          }}
        </form.Subscribe>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-t-white/10 bg-[#131516] p-4">
        <form.Subscribe
          selector={(state) => {
            const changed =
              state.values.hardcap !== formDefaultValues.hardcap ||
              state.values.softcap !== formDefaultValues.softcap ||
              state.values.maxBuyBnb !== formDefaultValues.maxBuyBnb ||
              state.values.durationHours !== formDefaultValues.durationHours ||
              state.values.vestingDelayMinutes !==
                formDefaultValues.vestingDelayMinutes ||
              String(state.values.vestingRate) !==
                String(formDefaultValues.vestingRate) ||
              state.values.creatorBuyTokens !==
                formDefaultValues.creatorBuyTokens ||
              state.values.creatorBuyBnb !== formDefaultValues.creatorBuyBnb
            return {
              canSubmit:
                state.canSubmit &&
                Boolean(
                  state.values.hardcap &&
                    state.values.softcap &&
                    state.values.maxBuyBnb,
                ) &&
                changed,
              isSubmitting: state.isSubmitting,
            }
          }}
        >
          {({ canSubmit, isSubmitting }) => (
            <Web3ActionButton
              type="submit"
              disabled={!canSubmit || presaleShare <= 0n}
              loading={isSubmitting}
              loadingText={m.presale_saving()}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] text-base font-bold text-white [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] transition-[transform,opacity] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
            >
              <span>{m.presale_save()}</span>
            </Web3ActionButton>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
