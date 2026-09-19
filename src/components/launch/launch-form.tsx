import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { isAddress } from 'viem'
import { useConfig, useConnection } from 'wagmi'
import { ArrowRightIcon, LucideClock3 } from 'lucide-react'
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
import BuybackVaultLogo from '@/assets/svgs/scheduled-buyback-vault-logo.svg'
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
import { Checkbox } from '../ui/checkbox'
import { CollapsibleFormSection } from '../common/collapsible-form-section'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData?.coinImg || null,
  )
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

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

          <CollapsibleFormSection title="選擇 VAULT">
            <button
              type="button"
              aria-label="選擇金庫"
              className="border border-[#484b51] bg-transparent p-4 gap-5 hover:border-[#FE810B] mt-6"
            >
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <img
                  loading="eager"
                  src={BuybackVaultLogo}
                  className="size-11 shrink-0 border border-[#484b51] bg-[#070808] object-cover"
                  alt="ScheduledBuybackVaultV3"
                />
                <div className="flex flex-col gap-0.5 text-left min-w-0 flex-1">
                  <span className="font-medium text-foreground text-sm">
                    自動回購金庫
                  </span>
                  <span className="min-w-0 truncate text-[0.625rem] text-[#84888c] block sm:line-clamp-2">
                    自动回购金库会按照预设规则，使用交易税收 BNB 自动回购并销毁
                    Token 或 LP Token。
                  </span>
                </div>
                <Checkbox checked className="size-4" />
              </div>
            </button>
            <div className="mt-4">
              <div
                className="h-2.5 w-full border border-[#FFA546] bg-[#070808]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #FE810B 0px, #FE810B 4px, transparent 4px, transparent 15px)',
                }}
              ></div>
              <div className="border-x border-b border-[#84888c] bg-transparent px-3 py-6">
                <h4 className="mb-5 text-base font-medium">配置自動回購金庫</h4>
                <div className="min-w-0 space-y-5">
                  <section>
                    <h4 className="text-sm font-semibold">回購方式</h4>
                    <p className="text-xs font-normal text-muted-foreground mt-1 mb-2">
                      选择金库将回购并销毁的资产。
                    </p>
                    <div className="grid sm:grid-cols-2 grid-cols-1 gap-3">
                      <button
                        type="button"
                        aria-label="Token 回購銷燬"
                        className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                      >
                        <strong className="block text-sm text-foreground">
                          Token 回購銷燬
                        </strong>
                        <small className="mt-1 text-muted-foreground text-xs">
                          税收产生的BNB将保存在金库，根据执行条件中的设置执行自动回购税收代币，并将其永久销毁。
                        </small>
                      </button>
                      <button
                        type="button"
                        aria-label="LP 回購銷燬"
                        className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                      >
                        <strong className="block text-sm text-foreground">
                          LP 回购销毁
                        </strong>
                        <small className="mt-1 text-muted-foreground text-xs">
                          税收产生的BNB将保存在金库，根据执行条件中的设置执行自动回购税收代币并组建LP，LP将永久销毁。如果暂时无法执行LP回购，金库将回退为Token回购销毁。
                        </small>
                      </button>
                    </div>
                  </section>
                  <section>
                    <h4 className="text-sm font-semibold">執行條件</h4>
                    <p className="text-xs font-normal text-muted-foreground mt-1 mb-2">
                      选择金库执行回购前必须满足的条件。
                    </p>
                    <div className="grid sm:grid-cols-2 grid-cols-1 gap-3">
                      <button
                        type="button"
                        aria-label="Token 回購銷燬"
                        className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                      >
                        <strong className="block text-sm text-foreground">
                          時間
                        </strong>
                        <small className="mt-1 text-muted-foreground text-xs">
                          在所选开始时间首次执行，之后按设定间隔重复执行。
                        </small>
                      </button>
                      <button
                        type="button"
                        aria-label="LP 回購銷燬"
                        className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                      >
                        <strong className="block text-sm text-foreground">
                          金庫餘額
                        </strong>
                        <small className="mt-1 text-muted-foreground text-xs">
                          当金库有足够 BNB 且已满足最短执行间隔时执行。
                        </small>
                      </button>
                      <button
                        type="button"
                        aria-label="LP 回購銷燬"
                        className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                      >
                        <strong className="block text-sm text-foreground">
                          时间 + 金库余额
                        </strong>
                        <small className="mt-1 text-muted-foreground text-xs">
                          仅在所选时间和所需金库余额两个条件都满足后执行。
                        </small>
                      </button>
                    </div>
                  </section>
                  <section className="flex flex-col gap-4 p-3 border bg-foreground/3">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        首次执行条件
                      </h4>
                      <p className="font-normal text-muted-foreground text-xs">
                        设置首次执行时间和/或金库开始执行回购前所需的余额。
                      </p>
                    </div>
                    <label className="block min-w-0">
                      <span className="mb-2 font-medium text-foreground/70 text-xs block">
                        预计首次可执行时间（UTC+8）
                      </span>
                      <div className="relative min-w-0">
                        <LucideClock3 className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 size-4" />
                        <input
                          type="datetime-local"
                          step={60}
                          className="block h-10 w-full min-w-0 max-w-full appearance-none overflow-hidden border border-foreground/15 bg-background/30 pl-10 pr-3 text-sm text-foreground outline-none"
                        />
                      </div>
                      <p className="mt-1 text-xs text-foreground/40">
                        固定使用 UTC+8，不跟随浏览器时区变化。
                      </p>
                    </label>
                  </section>
                  <section className="flex flex-col gap-4 p-3 border bg-foreground/3">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        执行设置
                      </h4>
                      <p className="font-normal text-muted-foreground text-xs">
                        设置两次执行之间的最短间隔，以及每次执行使用的 BNB
                        数量。
                      </p>
                    </div>
                    <label className="block min-w-0">
                      <span className="mb-2 font-medium text-foreground/70 text-xs block">
                        最短执行间隔
                      </span>
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 max-sm:grid-cols-1">
                        <input
                          inputMode="numeric"
                          min="1"
                          max="525600"
                          step="1"
                          className="h-10 w-full min-w-0 max-w-full border border-foreground/15 bg-background/30 px-3 text-sm text-white outline-none focus:border-[#D0FF00]"
                          type="number"
                          value="1"
                        />
                      </div>
                      <p className="mt-1 text-xs text-foreground/40">
                        请输入整数
                      </p>
                    </label>
                    <label className="block min-w-0">
                      <span className="mb-2 font-medium text-foreground/70 text-xs block">
                        每次执行使用的 BNB
                      </span>
                      <input
                        inputMode="decimal"
                        min="0.001"
                        max="10"
                        step="0.001"
                        className="h-10 w-full min-w-0 max-w-full border border-foreground/15 bg-background/30 px-3 text-sm text-white outline-none focus:border-[#D0FF00]"
                        type="number"
                        value="0.001"
                      />
                      <p className="mt-1 text-xs text-foreground/40">
                        金库每次执行时使用的 BNB 数量。
                      </p>
                    </label>
                  </section>
                </div>
              </div>
            </div>
          </CollapsibleFormSection>

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
