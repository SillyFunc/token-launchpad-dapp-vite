import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { isAddress } from 'viem'
import { useConfig, useConnection } from 'wagmi'
import { ArrowRightIcon } from 'lucide-react'
import { z } from 'zod'

import {
  saveTokenInfo,
  updateTokenInfo,
  uploadTokenLogo,
  type TokenDetail,
} from '@/api/token'
import { FieldInfo } from '@/components/common/field-info'
import { FormInput } from '@/components/common/form-input'
import { FormSectionTitle } from '@/components/common/form-section-title'
import { Slider } from '@/components/common/slider'
import { Web3ActionButton } from '@/components/common/web3-action-button'
import { ReservedAddressSelect } from '@/components/launch/reserved-address-select'
import { boardKeys } from '@/hooks/use-board'
import {
  reservedAddressKeys,
  useReservedAddressOptions,
  type ReservedAddressOption,
} from '@/hooks/use-reserved-addresses'
import { toast } from '@/lib/toast'
import { requestAuthSignature } from '@/lib/auth'
import { findVanitySalt, isPredictedTokenAddress } from '@/lib/vanity-salt'
import { m } from '@/paraglide/messages.js'
import { CollapsibleFormSection } from '../common/collapsible-form-section'
import { ScheduledBuybackVault } from './scheduled-buyback-vault'
import { TokenLogoUploader } from './token-logo-uploader'

const optionalUrl = z.union([z.literal(''), z.url()])

const nameSchema = z
  .string()
  .trim()
  .min(1, m.launch_token_name())
  .max(24, 'Token name must be 24 characters or fewer')

const symbolSchema = z
  .string()
  .trim()
  .min(1, m.launch_token_symbol())
  .max(15, 'Token symbol must be 15 characters or fewer')

const taxDurationSchema = z
  .string()
  .trim()
  .min(1, m.launch_tax_duration())
  .refine((value) => {
    const number = Number(value)
    return Number.isInteger(number) && number >= 1 && number <= 365
  }, 'Enter an integer from 1 to 365')

const antiFarmerDurationSchema = z
  .string()
  .trim()
  .refine((value) => {
    const number = Number(value)
    return Number.isInteger(number) && number >= 0 && number <= 365
  }, 'Enter an integer from 0 to 365')

const feeRecipientSchema = z
  .string()
  .trim()
  .min(1, m.launch_fee_recipient())
  // The refine also runs for empty values (zod does not short-circuit
  // across chained validators), so skip it to avoid a duplicate error
  // alongside the min(1) message.
  .refine((value) => !value || isAddress(value), 'Enter a valid EVM address')

function sanitizeDaysInput(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 3)
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function showError(error: unknown, fallback: string) {
  toast.error(m.request_failed(), getErrorMessage(error, fallback))
}

interface LaunchFormProps {
  initialData?: TokenDetail | null
  editId?: string | null
}

interface LaunchFormValues {
  reservedAddress: ReservedAddressOption | null
  name: string
  symbol: string
  description: string
  feeRecipient: string
  buyTax: number
  sellTax: number
  taxDuration: string
  antiFarmerDuration: string
  links: {
    telegram: string
    twitter: string
    website: string
  }
}

function getInitialReservedAddress(
  initialData: TokenDetail | null | undefined,
  reservedAddressOptions: ReservedAddressOption[],
): ReservedAddressOption | null {
  const initialSalt = String(initialData?.salt ?? '').toLowerCase()
  const initialContractAddress = initialData?.coinContractAddress ?? ''
  const normalizedContractAddress = initialContractAddress.toLowerCase()

  const matchedOption = initialSalt
    ? reservedAddressOptions.find(
        (option) => option.salt.toLowerCase() === initialSalt,
      )
    : reservedAddressOptions.find(
        (option) =>
          isAddress(initialContractAddress) &&
          option.address.toLowerCase() === normalizedContractAddress,
      )

  if (matchedOption) return matchedOption

  if (!isPredictedTokenAddress(initialData?.salt, initialContractAddress)) {
    return null
  }

  return {
    address: initialContractAddress,
    salt: String(initialData?.salt),
    coinStatus: 1,
  }
}

function getInitialValues(
  initialData: TokenDetail | null | undefined,
  address: string | undefined,
  reservedAddressOptions: ReservedAddressOption[],
): LaunchFormValues {
  return {
    reservedAddress: getInitialReservedAddress(
      initialData,
      reservedAddressOptions,
    ),
    name: initialData?.name ?? '',
    symbol: initialData?.symbol ?? '',
    description: initialData?.meta || initialData?.zhIntroduction || '',
    feeRecipient: initialData?.feeRecipient || address || '',
    buyTax: initialData?.buyTax ?? 0,
    sellTax: initialData?.sellTax ?? 0,
    taxDuration: String(initialData?.taxDuration ?? 365),
    antiFarmerDuration: String(initialData?.antiFarmerDuration ?? 30),
    links: {
      telegram: initialData?.telegram ?? '',
      twitter: initialData?.twitter ?? '',
      website: initialData?.website ?? '',
    },
  }
}

function normalizeValues(value: LaunchFormValues) {
  return {
    reservedAddress: value.reservedAddress
      ? {
          address: value.reservedAddress.address.toLowerCase(),
          salt: value.reservedAddress.salt.toLowerCase(),
        }
      : null,
    name: value.name.trim(),
    symbol: value.symbol.trim(),
    description: value.description.trim(),
    feeRecipient: value.feeRecipient.trim().toLowerCase(),
    buyTax: Number(value.buyTax),
    sellTax: Number(value.sellTax),
    taxDuration: Number(value.taxDuration),
    antiFarmerDuration: Number(value.antiFarmerDuration),
    links: {
      telegram: value.links.telegram.trim(),
      twitter: value.links.twitter.trim(),
      website: value.links.website.trim(),
    },
  }
}

function hasFormChanges(current: LaunchFormValues, initial: LaunchFormValues) {
  return (
    JSON.stringify(normalizeValues(current)) !==
    JSON.stringify(normalizeValues(initial))
  )
}

export function LaunchForm({ initialData, editId }: LaunchFormProps) {
  const isEditMode = Boolean(editId && initialData)
  const navigate = useNavigate()
  const { address } = useConnection()
  const config = useConfig()
  const queryClient = useQueryClient()
  const { data: reservedAddressOptions } = useReservedAddressOptions()
  const initialValues = useMemo(
    () => getInitialValues(initialData, address, reservedAddressOptions),
    [address, initialData, reservedAddressOptions],
  )
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      if (isEditMode && !logoFile && !hasFormChanges(value, initialValues)) {
        return
      }

      if (!address) {
        showError(null, m.launch_auth_required())
        return
      }

      if (!logoFile && !initialData?.coinImg) {
        showError(null, m.launch_upload_logo_error())
        return
      }

      const selectedReservedAddress = value.reservedAddress
      const isCurrentReservedAddress = Boolean(
        isEditMode &&
        selectedReservedAddress &&
        ((initialData?.salt &&
          initialData.salt.toLowerCase() ===
            selectedReservedAddress.salt.toLowerCase()) ||
          (isAddress(initialData?.coinContractAddress ?? '') &&
            initialData?.coinContractAddress.toLowerCase() ===
              selectedReservedAddress.address.toLowerCase())),
      )

      if (
        selectedReservedAddress &&
        selectedReservedAddress.coinStatus !== 0 &&
        !isCurrentReservedAddress
      ) {
        showError(null, m.launch_reserved_address_unavailable())
        return
      }

      const usePromiseToast = isEditMode && Boolean(editId)
      if (usePromiseToast) setIsEditSubmitting(true)

      try {
        const submission = (async () => {
          let salt: string
          if (selectedReservedAddress) {
            salt = selectedReservedAddress.salt
          } else if (
            isEditMode &&
            initialData?.salt &&
            !initialValues.reservedAddress
          ) {
            salt = initialData.salt
          } else {
            try {
              salt = (await findVanitySalt()).salt
            } catch {
              throw new Error(m.launch_salt_failed())
            }
          }

          const coinImg = logoFile
            ? await uploadTokenLogo(logoFile)
            : initialData?.coinImg || ''
          const auth = await requestAuthSignature(config, address)
          const payload = {
            name: value.name.trim(),
            coinImg,
            symbol: value.symbol.trim(),
            meta: value.description.trim(),
            buyTax: Number(value.buyTax),
            sellTax: Number(value.sellTax),
            feeRecipient: value.feeRecipient.trim(),
            taxDuration: Number(value.taxDuration),
            antiFarmerDuration: Number(value.antiFarmerDuration),
            liqExpectedOutputAmount: 0,
            launchType: Number(initialData?.launchType ?? 2),
            website: value.links.website.trim(),
            telegram: value.links.telegram.trim(),
            twitter: value.links.twitter.trim(),
            salt,
            ...(selectedReservedAddress
              ? { coinContractAddress: selectedReservedAddress.address }
              : isEditMode
                ? { coinContractAddress: '' }
                : {}),
            ...auth,
          }

          if (isEditMode && editId) {
            const updatedToken = await updateTokenInfo({
              id: editId,
              ...payload,
            })
            queryClient.setQueryData(['tokenDetail', editId], updatedToken)
          } else {
            await saveTokenInfo(payload)
          }

          await Promise.allSettled([
            queryClient.invalidateQueries({
              queryKey: boardKeys.all,
              refetchType: 'all',
            }),
            queryClient.invalidateQueries({
              queryKey: reservedAddressKeys.byUser(address),
              refetchType: 'all',
            }),
          ])
        })()

        if (isEditMode && editId) {
          await toast.promise(submission, {
            loading: { title: m.launch_saving() },
            success: { title: m.launch_update_success() },
            error: (error: unknown) => ({
              title: m.request_failed(),
              description: getErrorMessage(error, m.launch_submit_failed()),
              priority: 'high',
            }),
          })
        } else {
          await submission
          toast.success(m.launch_create_success())
        }

        navigate('/dashboard', {
          state:
            isEditMode && editId ? { focusTokenId: String(editId) } : undefined,
        })
      } catch (error) {
        if (usePromiseToast) return
        showError(error, m.launch_submit_failed())
      } finally {
        if (usePromiseToast) setIsEditSubmitting(false)
      }
    },
  })

  return (
    <form
      className="relative mx-auto flex w-full flex-col pb-28"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div
        aria-busy={isEditSubmitting}
        inert={isEditSubmitting}
        data-submitting={isEditSubmitting}
        className="flex flex-col border border-[#484b51] bg-[#131516] transition-opacity data-[submitting=true]:opacity-60"
      >
        <div className="flex items-center justify-between gap-3 border-b border-b-[#484b51] p-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white">
              {m.launch_reserve_title()}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {m.launch_reserve_description()}
            </div>
          </div>
          <Link
            to="/prelaunch"
            className="flex shrink-0 items-center justify-center whitespace-nowrap rounded border border-[#ffd98c] px-4 py-2 text-xs font-semibold text-[#ffd98c] transition-colors hover:bg-[#ffd98c] hover:text-black sm:px-6 sm:py-2.5"
          >
            <span>{m.launch_reserve_action()}</span>
            <ArrowRightIcon className="ml-1.5 size-3 shrink-0" />
          </Link>
        </div>

        <div className="flex flex-col space-y-10 p-4">
          <CollapsibleFormSection title="预留 CA">
            <form.Field name="reservedAddress">
              {(field) => (
                <ReservedAddressSelect
                  id={field.name}
                  value={field.state.value}
                  currentValue={initialValues.reservedAddress}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </CollapsibleFormSection>

          <div className="flex flex-col gap-6">
            <FormSectionTitle title={m.launch_basic_info()} />
            <TokenLogoUploader
              initialPreview={initialData?.coinImg || null}
              onFileChange={setLogoFile}
            />

            <form.Field
              name="name"
              validators={{ onMount: nameSchema, onChange: nameSchema }}
            >
              {(field) => (
                <FormField label={m.launch_token_name()} required>
                  <FormInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={field.state.value}
                    maxLength={24}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(event.target.value.slice(0, 24))
                    }
                  />
                  <FieldInfo field={field} />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="symbol"
              validators={{ onMount: symbolSchema, onChange: symbolSchema }}
            >
              {(field) => (
                <FormField label={m.launch_token_symbol()} required>
                  <FormInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={field.state.value}
                    maxLength={15}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(event.target.value.slice(0, 15))
                    }
                  />
                  <FieldInfo field={field} />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="description"
              validators={{ onChange: z.string().max(500) }}
            >
              {(field) => (
                <FormField label={m.launch_token_description()}>
                  <textarea
                    id={field.name}
                    name={field.name}
                    rows={4}
                    maxLength={500}
                    autoComplete="off"
                    spellCheck={false}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className="box-border min-h-30 w-full appearance-none resize-none rounded-xs border border-[#84888c] bg-transparent p-3 text-sm text-white placeholder:text-[#84888c] focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FE810B] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <FieldInfo field={field} />
                </FormField>
              )}
            </form.Field>
          </div>

          <ScheduledBuybackVault />

          <div className="flex flex-col gap-6">
            <FormSectionTitle title={m.launch_tax_settings()} required />
            <form.Field name="buyTax">
              {(field) => (
                <Slider
                  label={m.launch_buy_tax()}
                  required
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
            <form.Field name="sellTax">
              {(field) => (
                <Slider
                  label={m.launch_sell_tax()}
                  required
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </div>

          <div className="flex flex-col">
            <FormSectionTitle title={m.launch_tax_duration()} required />
            <form.Field
              name="taxDuration"
              validators={{
                onMount: taxDurationSchema,
                onChange: taxDurationSchema,
              }}
            >
              {(field) => (
                <div className="mt-4 flex flex-col">
                  <FormInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(sanitizeDaysInput(event.target.value))
                    }
                    rightAdornment="天"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>
            <p className="mt-2 text-xs text-[#84888c]">
              {m.launch_tax_duration_description()}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <FormSectionTitle title={m.launch_fee_recipient()} required />
            <form.Field
              name="feeRecipient"
              validators={{
                onBlur: feeRecipientSchema,
                onChange: feeRecipientSchema,
              }}
            >
              {(field) => (
                <div className="flex flex-col">
                  <FormInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    aria-label={m.launch_fee_recipient()}
                    autoComplete="off"
                    spellCheck={false}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FieldInfo field={field} showBeforeBlur />
                </div>
              )}
            </form.Field>
          </div>

          <CollapsibleFormSection title={m.launch_anti_farmer()}>
            <form.Field
              name="antiFarmerDuration"
              validators={{
                onMount: antiFarmerDurationSchema,
                onChangeListenTo: ['taxDuration'],
                onChange: ({ value, fieldApi }) => {
                  const result = antiFarmerDurationSchema.safeParse(value)
                  if (!result.success) return result.error.issues[0]?.message

                  const taxDuration = Number(
                    fieldApi.form.getFieldValue('taxDuration'),
                  )
                  if (Number(value) > taxDuration) {
                    return 'Protection period cannot exceed tax duration'
                  }
                  return undefined
                },
              }}
            >
              {(field) => (
                <div className="mt-4 flex flex-col">
                  <FormInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(sanitizeDaysInput(event.target.value))
                    }
                    rightAdornment="天"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>
            <p className="mt-2 text-xs text-[#84888c]">
              {m.launch_anti_farmer_description()}
            </p>
          </CollapsibleFormSection>

          <CollapsibleFormSection title={m.launch_optional_links()}>
            <div className="mt-4 flex flex-col gap-6">
              <form.Field
                name="links.telegram"
                validators={{ onChange: optionalUrl }}
              >
                {(field) => (
                  <div className="flex flex-col">
                    <label
                      htmlFor={field.name}
                      className="mb-2 text-sm text-white"
                    >
                      {m.launch_telegram()}
                    </label>
                    <FormInput
                      id={field.name}
                      name={field.name}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>
              <form.Field
                name="links.twitter"
                validators={{ onChange: optionalUrl }}
              >
                {(field) => (
                  <div className="flex flex-col">
                    <label
                      htmlFor={field.name}
                      className="mb-2 text-sm text-white"
                    >
                      {m.launch_twitter()}
                    </label>
                    <FormInput
                      id={field.name}
                      name={field.name}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>
              <form.Field
                name="links.website"
                validators={{ onChange: optionalUrl }}
              >
                {(field) => (
                  <div className="flex flex-col">
                    <label
                      htmlFor={field.name}
                      className="mb-2 text-sm text-white"
                    >
                      {m.launch_website()}
                    </label>
                    <FormInput
                      id={field.name}
                      name={field.name}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>
            </div>
          </CollapsibleFormSection>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-t-white/10 bg-[#131516] p-4">
        <form.Subscribe
          selector={(state) => ({
            canSubmit:
              state.isValid &&
              !state.isSubmitting &&
              (!isEditMode ||
                logoFile !== null ||
                hasFormChanges(state.values, initialValues)),
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Web3ActionButton
              type="submit"
              disabled={!canSubmit}
              loading={isSubmitting && !isEditMode}
              loadingText={m.launch_creating()}
              className="flex h-10.5 text-foreground w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#FE810B] text-base font-bold [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] transition-[transform,opacity] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
            >
              <span>
                {isEditMode ? m.launch_save_action() : m.launch_create_action()}
              </span>
            </Web3ActionButton>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-0.5 text-sm text-white">
        <span>{label}</span>
        {required && <span className="text-xs text-[#f7594b]">*</span>}
      </label>
      {children}
    </div>
  )
}
