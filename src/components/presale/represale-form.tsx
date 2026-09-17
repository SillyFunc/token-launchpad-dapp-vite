import { useMemo, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useConfig, useReadContract } from 'wagmi'
import { waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import { formatEther, parseEther, type Address } from 'viem'
import { hoursToSeconds, minutesToSeconds } from 'date-fns'
import { Calculator, Coins } from 'lucide-react'
import { presaleAbi } from '@sillyfunc/launchpad-contracts'

import { updateTokenInfo, type TokenDetail } from '@/api/token'
import { FieldInfo } from '@/components/common/field-info'
import { FormSectionTitle } from '@/components/common/form-section-title'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { FieldWrap, UnitInput } from '@/components/presale/form-fields'
import { toast } from '@/components/ui/toast'
import type { TokenGateResult } from '@/hooks/use-token-gate'
import { requestAuthSignature } from '@/lib/auth'
import { getContractErrorMessage } from '@/lib/contract-error'
import { formatDecimalText } from '@/lib/format'
import { sanitizeDecimal, sanitizeInteger } from '@/lib/presale-input'
import { calculatePresaleTokenPrice } from '@/lib/presale-price'
import { cn } from '@/lib/utils'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

const DURATION_MIN_SEC = hoursToSeconds(1)
const DURATION_MAX_SEC = hoursToSeconds(90)
const VESTING_DELAY_MIN_SEC = minutesToSeconds(5)
const VESTING_DELAY_MAX_SEC = minutesToSeconds(30)
const START_IMMEDIATELY_SEC = 0

function durationHoursDefault(seconds: bigint): string {
  const hours = Math.round(Number(seconds) / 3600)
  if (!Number.isFinite(hours) || hours < 1) return '1'
  return String(Math.min(90, hours))
}

export interface RepresaleFormProps {
  token: TokenDetail | null
  presaleAddress: Address
  address: Address
  gate: TokenGateResult
  onSuccess: () => void
}

export function RepresaleForm({
  token,
  presaleAddress,
  address,
  gate,
  onSuccess,
}: RepresaleFormProps) {
  const config = useConfig()
  const [submitStep, setSubmitStep] = useState('')
  const submitInFlightRef = useRef(false)

  const { data: maxPresaleTokens } = useReadContract({
    address: presaleAddress,
    abi: presaleAbi,
    functionName: 'maxPresaleTokens',
    chainId: PLATFORM_CHAIN_ID,
    query: { staleTime: 30_000 },
  })
  const { data: duration } = useReadContract({
    address: presaleAddress,
    abi: presaleAbi,
    functionName: 'presaleDuration',
    chainId: PLATFORM_CHAIN_ID,
    query: { staleTime: 30_000 },
  })
  const { data: onchainSlippage } = useReadContract({
    address: presaleAddress,
    abi: presaleAbi,
    functionName: 'slippageProtection',
    chainId: PLATFORM_CHAIN_ID,
    query: { staleTime: 30_000 },
  })

  const initialDurationHours = useMemo(
    () => durationHoursDefault(duration ?? 3600n),
    [duration],
  )
  const initialHardcap = gate.hardCap > 0n ? formatEther(gate.hardCap) : ''
  const initialSoftcap = gate.softCap > 0n ? formatEther(gate.softCap) : ''
  const initialVestingMinutes = (() => {
    const minutes = Math.ceil(Number(gate.vestingDelay) / 60)
    if (!(gate.vestingDelay > 0n) || !Number.isFinite(minutes)) return '5'
    return String(Math.min(30, Math.max(5, minutes)))
  })()
  const initialMaxBuyBnb =
    gate.maxBuyPerWallet > 0n && gate.presalePrice > 0n
      ? formatEther((gate.maxBuyPerWallet * gate.presalePrice) / 10n ** 18n)
      : ''

  const formDefaultValues = {
    hardcap: initialHardcap,
    softcap: initialSoftcap,
    maxBuyBnb: initialMaxBuyBnb,
    durationHours: initialDurationHours,
    vestingDelayMinutes: initialVestingMinutes,
    vestingRate: Number(gate.vestingRate) || 5,
  }

  const form = useForm({
    defaultValues: formDefaultValues,
    onSubmit: async ({ value }) => {
      if (submitInFlightRef.current) return
      submitInFlightRef.current = true

      try {
        const hardcapWei = parseEther(value.hardcap || '0')
        const softcapWei = parseEther(value.softcap || '0')
        const presaleShare = gate.presaleShare
        if (hardcapWei <= 0n || presaleShare <= 0n) {
          throw new Error(m.presale_error_hardcap_or_share())
        }
        if (softcapWei < hardcapWei / 2n || softcapWei > hardcapWei) {
          throw new Error(m.presale_error_softcap_range())
        }
        const maxPresaleTokensWei = maxPresaleTokens
        if (
          !maxPresaleTokensWei ||
          maxPresaleTokensWei <= 0n ||
          maxPresaleTokensWei > presaleShare
        ) {
          throw new Error(m.presale_error_max_presale_tokens())
        }
        const priceWei = calculatePresaleTokenPrice(
          hardcapWei,
          maxPresaleTokensWei,
        )
        if (!priceWei) throw new Error(m.presale_error_wait_share())
        const maxRaiseWei = (priceWei * maxPresaleTokensWei) / 10n ** 18n
        if (maxRaiseWei < softcapWei) {
          throw new Error(m.presale_error_price_too_low())
        }
        const maxBuyBnbWei = parseEther(value.maxBuyBnb || '0')
        if (
          maxBuyBnbWei <= 0n ||
          maxBuyBnbWei > hardcapWei ||
          maxBuyBnbWei > maxRaiseWei
        ) {
          throw new Error(m.presale_error_max_buy_range())
        }
        const maxBuyTokensWei = (maxBuyBnbWei * 10n ** 18n) / priceWei
        if (maxBuyTokensWei <= 0n) {
          throw new Error(m.presale_error_max_buy_too_small())
        }
        const durationSec = Math.round(
          hoursToSeconds(Number(value.durationHours || 0)),
        )
        const vestingDelaySec = BigInt(
          Math.round(minutesToSeconds(Number(value.vestingDelayMinutes || 0))),
        )
        if (durationSec < DURATION_MIN_SEC || durationSec > DURATION_MAX_SEC) {
          throw new Error(m.presale_error_duration())
        }
        if (
          vestingDelaySec < VESTING_DELAY_MIN_SEC ||
          vestingDelaySec > VESTING_DELAY_MAX_SEC
        ) {
          throw new Error(m.presale_error_vesting_delay())
        }
        if (!token?.id) throw new Error(m.presale_error_missing_id())

        const slippageBps =
          onchainSlippage !== undefined && onchainSlippage > 0n
            ? onchainSlippage
            : Number(token.slippage) > 0
              ? BigInt(Number(token.slippage))
              : 500n

        const auth = await requestAuthSignature(config, address)

        if (gate.presaleStatus === 4) {
          setSubmitStep(m.presale_resetting())
          const relaunchHash = await writeContract(config, {
            address: presaleAddress,
            abi: presaleAbi,
            functionName: 'relaunchPresale',
            account: address,
            chainId: PLATFORM_CHAIN_ID,
          })
          await waitForTransactionReceipt(config, {
            hash: relaunchHash,
            chainId: PLATFORM_CHAIN_ID,
          })
        }

        setSubmitStep(m.presale_updating_terms())
        const configHash = await writeContract(config, {
          address: presaleAddress,
          abi: presaleAbi,
          functionName: 'setPresaleConfig',
          account: address,
          chainId: PLATFORM_CHAIN_ID,
          args: [
            {
              presaleTokenPrice: priceWei,
              maxPresaleTokens: maxPresaleTokensWei,
              maxBuyPerWallet: maxBuyTokensWei,
              hardcap: hardcapWei,
              minLiquidityAmount: softcapWei,
              softCap: softcapWei,
              startTime: BigInt(START_IMMEDIATELY_SEC),
              duration: BigInt(durationSec),
              vestingDelay: vestingDelaySec,
              vestingRate: BigInt(Number(value.vestingRate)),
              slippageProtection: slippageBps,
            },
          ],
        })
        await waitForTransactionReceipt(config, {
          hash: configHash,
          chainId: PLATFORM_CHAIN_ID,
        })

        setSubmitStep(m.presale_syncing())
        await updateTokenInfo({
          id: token.id,
          name: token.name,
          coinImg: token.coinImg,
          symbol: token.symbol,
          meta: token.meta || token.zhIntroduction || '',
          buyTax: token.buyTax ?? 0,
          sellTax: token.sellTax ?? 0,
          feeRecipient: token.feeRecipient || address,
          taxDuration: Number(token.taxDuration) || 30,
          antiFarmerDuration: Number(token.antiFarmerDuration) || 0,
          liqExpectedOutputAmount: 0,
          launchType: Number(token.launchType) || 2,
          website: token.website || '',
          telegram: token.telegram || '',
          twitter: token.twitter || '',
          presaleTokenPrice: formatEther(priceWei),
          maxBuyPerWallet: formatEther(maxBuyTokensWei),
          hardcap: value.hardcap,
          softcap: value.softcap,
          minLiquidityAmount: value.softcap,
          startTime: START_IMMEDIATELY_SEC,
          endTime: 0,
          vestingDelay: Number(vestingDelaySec),
          vestingRate: Number(value.vestingRate),
          slippage: Number(slippageBps),
          ...auth,
        })

        toast.add({
          type: 'success',
          title: m.presale_edit_save_success(),
        })
        onSuccess()
      } catch (error: unknown) {
        toast.add({
          type: 'error',
          title: m.presale_config_failed(),
          description: getContractErrorMessage(error),
        })
      } finally {
        submitInFlightRef.current = false
        setSubmitStep('')
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
            onChange: ({ value }) =>
              !value || Number(value) <= 0
                ? m.presale_error_hardcap()
                : undefined,
          }}
        >
          {(field) => (
            <FieldWrap label={m.presale_hardcap()} required>
              <UnitInput
                inputMode="decimal"
                autoComplete="off"
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
              const n = Number(value)
              const hardcap = Number(fieldApi.form.getFieldValue('hardcap'))
              if (!value || !Number.isFinite(n) || n <= 0)
                return m.presale_error_softcap()
              if (!Number.isFinite(hardcap) || hardcap <= 0)
                return m.presale_error_hardcap_first()
              if (n < hardcap * 0.5)
                return m.presale_error_softcap_min_simple({
                  min: formatDecimalText(hardcap * 0.5),
                })
              if (n > hardcap) return m.presale_error_softcap_over()
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
                    inputMode="decimal"
                    autoComplete="off"
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
              let hardcapWei: bigint
              let softcapWei: bigint
              try {
                maxBuyBnbWei = parseEther(value)
                hardcapWei = parseEther(
                  fieldApi.form.getFieldValue('hardcap') || '0',
                )
                softcapWei = parseEther(
                  fieldApi.form.getFieldValue('softcap') || '0',
                )
              } catch {
                return m.presale_error_invalid_amounts()
              }
              if (maxBuyBnbWei <= 0n) return m.presale_error_max_buy_positive()
              if (hardcapWei <= 0n) return m.presale_error_hardcap_first()
              const priceWei = calculatePresaleTokenPrice(
                hardcapWei,
                maxPresaleTokens ?? 0n,
              )
              if (!priceWei) return m.presale_error_share_loading()
              if (maxBuyBnbWei > hardcapWei) return m.presale_error_max_buy_hardcap()
              const maxRaiseWei =
                (priceWei * (maxPresaleTokens ?? 0n)) / 10n ** 18n
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
                    inputMode="decimal"
                    autoComplete="off"
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
              const seconds = hoursToSeconds(n)
              if (seconds < DURATION_MIN_SEC || seconds > DURATION_MAX_SEC)
                return m.presale_error_duration()
              return undefined
            },
          }}
        >
          {(field) => (
            <FieldWrap label={m.presale_duration()} required>
              <UnitInput
                inputMode="numeric"
                autoComplete="off"
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
            const priceText = (() => {
              try {
                const priceWei = calculatePresaleTokenPrice(
                  parseEther(hardcap || '0'),
                  maxPresaleTokens ?? 0n,
                )
                return priceWei ? formatEther(priceWei) : ''
              } catch {
                return ''
              }
            })()

            return (
              <div className="flex flex-col divide-y divide-white/5 border border-[#2F3737] bg-[#181a1d] px-3.5 py-1 text-xs">
                <div className="flex h-10 items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-3.5 shrink-0 text-[#FFA546]" />
                    <span className="text-xs font-medium leading-none text-neutral-200">
                      {m.presale_presale_supply()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <span className="font-mono text-sm font-bold text-white">
                      {maxPresaleTokens === undefined
                        ? '--'
                        : formatEther(maxPresaleTokens)}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {m.presale_token_count()}
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
                      {priceText || '--'}
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
                inputMode="numeric"
                autoComplete="off"
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
            onChange: ({ value }) =>
              [5, 10, 15, 20].includes(Number(value))
                ? undefined
                : m.presale_error_vesting_rate(),
          }}
        >
          {(field) => (
            <FieldWrap label={m.presale_vesting_rate()} required>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => field.handleChange(rate)}
                    className={cn(
                      'flex h-10 cursor-pointer items-center justify-center border text-xs font-semibold transition-all select-none',
                      Number(field.state.value) === rate
                        ? 'border-[#FE810B] bg-[#FE810B]/15 text-[#FFA546]'
                        : 'border-[#2F3737] bg-[#1a1c1e] text-neutral-300 hover:border-[#FE810B]/50 hover:text-white',
                    )}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </FieldWrap>
          )}
        </form.Field>
        <form.Subscribe
          selector={(state) => ({
            rate: Number(state.values.vestingRate) || 5,
            delay: Number(state.values.vestingDelayMinutes) || 5,
          })}
        >
          {({ rate, delay }) => (
            <div className="flex flex-col divide-y divide-white/5 border border-[#2F3737] bg-[#181a1d] px-4 py-3 text-xs">
              <div className="flex items-center justify-between pb-2.5">
                <span className="text-neutral-400">{m.presale_rounds()}</span>
                <span className="font-mono font-semibold text-white">
                  {m.presale_rounds_value({ count: Math.ceil(100 / rate) })}
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
          )}
        </form.Subscribe>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-t-white/10 bg-[#131516] p-4">
        <div className="mx-auto flex w-full flex-col items-center justify-between gap-3">
          <div className="ml-auto w-full">
            <form.Subscribe
              selector={(state) => {
                const changed =
                  state.values.hardcap !== formDefaultValues.hardcap ||
                  state.values.softcap !== formDefaultValues.softcap ||
                  state.values.maxBuyBnb !== formDefaultValues.maxBuyBnb ||
                  state.values.durationHours !==
                    formDefaultValues.durationHours ||
                  state.values.vestingDelayMinutes !==
                    formDefaultValues.vestingDelayMinutes ||
                  String(state.values.vestingRate) !==
                    String(formDefaultValues.vestingRate)
                return {
                  canSubmit:
                    state.canSubmit &&
                    Boolean(
                      state.values.hardcap &&
                        state.values.softcap &&
                        state.values.maxBuyBnb,
                    ) &&
                    changed,
                  isSubmitting: state.isSubmitting || Boolean(submitStep),
                }
              }}
            >
              {({ canSubmit, isSubmitting }) => (
                <Web3ActionButton
                  type="submit"
                  disabled={
                    !canSubmit ||
                    maxPresaleTokens === undefined ||
                    gate.isLoading
                  }
                  loading={isSubmitting}
                  loadingText={submitStep || m.presale_saving()}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] text-base font-bold text-white [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] transition-[transform,opacity] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
                >
                  <span>{m.presale_save_terms()}</span>
                </Web3ActionButton>
              )}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </form>
  )
}
