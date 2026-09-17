import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from '@tanstack/react-form'
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
import { toast } from '@/lib/toast'
import { requestAuthSignature } from '@/lib/auth'
import { m } from '@/paraglide/messages.js'

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
  .refine(
    (value) => {
      const number = Number(value)
      return Number.isInteger(number) && number >= 1 && number <= 365
    },
    'Enter an integer from 1 to 365',
  )

const antiFarmerDurationSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      const number = Number(value)
      return Number.isInteger(number) && number >= 0 && number <= 365
    },
    'Enter an integer from 0 to 365',
  )

const feeRecipientSchema = z
  .string()
  .trim()
  .min(1, m.launch_fee_recipient())
  .refine((value) => isAddress(value), 'Enter a valid EVM address')

function sanitizeDaysInput(value: string) {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 3)
}

function showError(error: unknown, fallback: string) {
  toast.error(
    m.request_failed(),
    error instanceof Error && error.message ? error.message : fallback,
  )
}

interface LaunchFormProps {
  initialData?: TokenDetail | null
  editId?: string | null
}

interface LaunchFormValues {
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

function getInitialValues(
  initialData: TokenDetail | null | undefined,
  address: string | undefined,
): LaunchFormValues {
  return {
    name: initialData?.name ?? '',
    symbol: initialData?.symbol ?? '',
    description: initialData?.meta || initialData?.zhIntroduction || '',
    feeRecipient: initialData?.feeRecipient || address || '',
    buyTax: initialData?.buyTax ?? 0,
    sellTax: initialData?.sellTax ?? 0,
    taxDuration: String(initialData?.taxDuration ?? 30),
    antiFarmerDuration: String(initialData?.antiFarmerDuration ?? 0),
    links: {
      telegram: initialData?.telegram ?? '',
      twitter: initialData?.twitter ?? '',
      website: initialData?.website ?? '',
    },
  }
}

function normalizeValues(value: LaunchFormValues) {
  return {
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData?.coinImg || null,
  )
  const [initialValues] = useState(() => getInitialValues(initialData, address))

  useEffect(
    () => () => {
      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    },
    [logoPreview],
  )

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

      if (!logoFile && !logoPreview) {
        showError(null, m.launch_upload_logo_error())
        return
      }

      try {
        const coinImg = logoFile
          ? await uploadTokenLogo(logoFile)
          : logoPreview || ''
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
          ...(initialData?.salt ? { salt: initialData.salt } : {}),
          ...auth,
        }

        if (isEditMode && editId) {
          await updateTokenInfo({ id: editId, ...payload })
          toast.success(m.launch_update_success())
        } else {
          await saveTokenInfo(payload)
          toast.success(m.launch_create_success())
        }

        navigate('/dashboard')
      } catch (error) {
        showError(error, m.launch_submit_failed())
      }
    },
  })

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError(null, m.launch_invalid_image())
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      showError(null, m.launch_image_too_large())
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  return (
    <form
      className="relative mx-auto flex w-full flex-col pb-28"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="flex flex-col border border-[#484b51] bg-[#131516]">
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
          <div className="flex flex-col gap-6">
            <FormSectionTitle title={m.launch_basic_info()} />
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                aria-label={m.launch_upload_logo()}
                onClick={() => fileInputRef.current?.click()}
                className="group relative isolate flex h-25 w-25 shrink-0 cursor-pointer flex-col items-center justify-center text-[#84888c] transition-colors hover:text-white"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt={m.launch_upload_logo()}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 200 200"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10"
                  >
                    <rect
                      x="0.5"
                      y="0.5"
                      width="199"
                      height="199"
                      rx="3.5"
                      stroke="currentColor"
                    />
                    <path d="M12 172L12 188L28 188" stroke="currentColor" />
                    <path d="M172 188L188 188L188 172" stroke="currentColor" />
                    <path d="M28 12L12 12L12 28" stroke="currentColor" />
                    <path d="M188 28L188 12L172 12" stroke="currentColor" />
                    <path
                      d="M94.3333 130H76.6667C74.8986 130 73.2029 129.298 71.9526 128.047C70.7024 126.797 70 125.101 70 123.333V76.6667C70 74.8986 70.7024 73.2029 71.9526 71.9526C73.2029 70.7024 74.8986 70 76.6667 70H123.333C125.101 70 126.797 70.7024 128.047 71.9526C129.298 73.2029 130 74.8986 130 76.6667V110L119.667 99.6667C118.412 98.4373 116.723 97.7525 114.967 97.7613C113.211 97.77 111.529 98.4715 110.287 99.7133L80 130"
                      stroke="#FE810B"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M106.668 125L116.668 115L126.668 125"
                      stroke="#FE810B"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M116.668 133.333V115"
                      stroke="#FE810B"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M89.9987 96.6668C93.6806 96.6668 96.6654 93.6821 96.6654 90.0002C96.6654 86.3183 93.6806 83.3335 89.9987 83.3335C86.3168 83.3335 83.332 86.3183 83.332 90.0002C83.332 93.6821 86.3168 96.6668 89.9987 96.6668Z"
                      stroke="#FE810B"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#FB5F16]">
                  // {m.launch_supported_formats()}
                </span>
                <span className="mt-4 text-xs leading-relaxed text-[#a0a3a7]">
                  {m.launch_logo_formats_line1()}
                  <br />
                  {m.launch_logo_formats_line2()}
                </span>
              </div>
            </div>

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

          <div className="flex flex-col gap-6">
            <FormSectionTitle title={m.launch_tax_settings()} />
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
                onMount: feeRecipientSchema,
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
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>
          </div>

          <div className="flex flex-col">
            <FormSectionTitle title={m.launch_anti_farmer()} required />
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
          </div>

          <div className="flex flex-col">
            <FormSectionTitle title={m.launch_optional_links()} />
            <div className="mt-6 flex flex-col gap-6">
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
                      onChange={(event) => field.handleChange(event.target.value)}
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
                      onChange={(event) => field.handleChange(event.target.value)}
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
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>
            </div>
          </div>
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
              loading={isSubmitting}
              loadingText={
                isEditMode ? m.launch_saving() : m.launch_creating()
              }
              className="flex h-10.5 text-background w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] text-base font-bold [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] transition-[transform,opacity] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
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
