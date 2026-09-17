import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useBalance, useConfig, useConnection } from 'wagmi'
import { formatEther } from 'viem'
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  RefreshCcw,
} from 'lucide-react'

import { saveTokenSalt } from '@/api/token'
import { PageTitle } from '@/components/common/page-title'
import { SectionWrapper } from '@/components/prelaunch/section-wrapper'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/lib/toast'
import {
  CoordinatorError,
  FALLBACK_RESERVATION_FEE_WEI,
  useReservationFee,
  useReserveTokenAddress,
  type CoordinatorErrorCode,
} from '@/hooks/use-reservation'
import { useReservedAddresses } from '@/hooks/use-reserved-addresses'
import { requestAuthSignature, type AuthSignature } from '@/lib/auth'
import { getContractErrorMessage } from '@/lib/contract-error'
import { ApiError } from '@/lib/http/error'
import { useVanitySalt } from '@/lib/vanity-salt'
import { PLATFORM_CHAIN_ID, getExplorerAddressUrl } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

const gradientButtonClass =
  'w-full text-white  font-semibold text-sm font-semibold h-10 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B]' as const

const RESERVED_ADDRESS_STATUS = {
  0: { label: () => m.prelaunch_status_unused(), className: 'text-[#7adfa1]' },
  1: {
    label: () => m.prelaunch_status_occupied(),
    className: 'text-[#FFA546]',
  },
  2: { label: () => m.prelaunch_status_used(), className: 'text-[#84888c]' },
} as const

const LOCK_ERROR_MESSAGES: Partial<Record<CoordinatorErrorCode, () => string>> =
  {
    USER_REJECTED: () => m.prelaunch_error_user_rejected(),
    INSUFFICIENT_FUNDS: () => m.prelaunch_error_insufficient_funds(),
    WRONG_NETWORK: () => m.prelaunch_error_wrong_network(),
    INSUFFICIENT_RESERVATION_FEE: () => m.prelaunch_error_insufficient_fee(),
    ADDRESS_ALREADY_RESERVED: () => m.prelaunch_error_already_reserved(),
    ADDRESS_ALREADY_DEPLOYED: () => m.prelaunch_error_already_deployed(),
    INVALID_SALT: () => m.prelaunch_error_invalid_salt(),
    INVALID_VANITY_SUFFIX: () => m.prelaunch_error_invalid_suffix(),
    FACTORY_DISABLED: () => m.prelaunch_error_factory_disabled(),
  }

function showToast(
  type: 'success' | 'error',
  description: string,
  title?: string,
) {
  if (type === 'success') {
    toast.success(title, description)
    return
  }

  toast.error(title, description)
}

function toLockErrorMessage(err: unknown): string {
  if (err instanceof CoordinatorError) {
    return (
      LOCK_ERROR_MESSAGES[err.code]?.() ?? m.prelaunch_error_lock_fallback()
    )
  }
  if (err instanceof ApiError) {
    return err.message || m.prelaunch_error_save_fallback()
  }
  if (err instanceof Error) return getContractErrorMessage(err)
  return m.prelaunch_error_lock_fallback()
}

export const PrelaunchPage = () => {
  const nav = useNavigate()
  const config = useConfig()
  const { address, chainId } = useConnection()
  const { fee: reservationFeeWei, formattedFee: reservationFee } =
    useReservationFee()
  const { data: balanceData } = useBalance({
    address,
    chainId: PLATFORM_CHAIN_ID,
    query: {
      enabled: Boolean(address),
      staleTime: 10_000,
    },
  })
  const { execute: reserveTokenAddress } = useReserveTokenAddress()
  const {
    salt,
    predictedAddress,
    isSearching,
    error: searchError,
    regenerate,
    reset: resetSalt,
  } = useVanitySalt()
  const {
    addresses: reservedAddresses,
    isLoading,
    isFetching,
    refetch,
  } = useReservedAddresses()
  const [isReserving, setIsReserving] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value)
    setCopiedAddress(value)
    showToast('success', m.prelaunch_copied())
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const handleGenerate = () => {
    regenerate()
  }

  useEffect(() => {
    if (searchError)
      showToast('error', searchError, m.prelaunch_generate_failed())
  }, [searchError])

  const canLock = Boolean(salt && predictedAddress && address) && !isReserving

  const handleLock = async () => {
    if (!salt || !predictedAddress || !address) return

    if (chainId !== PLATFORM_CHAIN_ID) {
      showToast(
        'error',
        m.prelaunch_wrong_network(),
        m.prelaunch_wrong_network_title(),
      )
      return
    }

    const requiredFeeWei = reservationFeeWei ?? FALLBACK_RESERVATION_FEE_WEI
    if (!balanceData) {
      showToast(
        'error',
        m.prelaunch_balance_loading(),
        m.prelaunch_balance_loading_title(),
      )
      return
    }
    if (balanceData.value < requiredFeeWei) {
      showToast(
        'error',
        m.prelaunch_insufficient_balance({
          required: formatEther(requiredFeeWei),
          balance: formatEther(balanceData.value),
        }),
        m.prelaunch_insufficient_balance_title(),
      )
      return
    }

    setIsReserving(true)
    try {
      let auth: AuthSignature
      let txHash: string

      try {
        auth = await requestAuthSignature(config, address)
      } catch (err) {
        console.error('[Prelaunch] reservation auth signature failed', {
          contractAddress: predictedAddress,
          error: err,
        })
        showToast('error', toLockErrorMessage(err), m.prelaunch_sign_failed())
        return
      }

      try {
        const result = await reserveTokenAddress(salt)
        txHash = result.hash
      } catch (err) {
        console.error('[Prelaunch] on-chain lock failed', {
          contractAddress: predictedAddress,
          error: err,
        })
        showToast('error', toLockErrorMessage(err), m.prelaunch_lock_failed())
        return
      }

      try {
        await saveTokenSalt({
          contractAddress: predictedAddress,
          salt,
          txHash,
          address: auth.address,
          message: auth.message,
          signature: auth.signature,
        })
      } catch (err) {
        console.error(
          '[Prelaunch] failed to save reservation after on-chain lock',
          {
            contractAddress: predictedAddress,
            txHash,
            error: err,
          },
        )
        showToast(
          'error',
          m.prelaunch_save_failed_description(),
          m.prelaunch_save_failed_title(),
        )
        resetSalt()
        void refetch()
        return
      }

      showToast(
        'success',
        m.prelaunch_lock_success_description(),
        m.prelaunch_lock_success_title(),
      )
      resetSalt()
      const refreshed = await refetch()
      if (refreshed.error) {
        console.warn('[Prelaunch] reservation saved but list refresh failed', {
          error: refreshed.error,
          contractAddress: predictedAddress,
        })
      }
    } finally {
      setIsReserving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="mt-6 mb-4">
        <PageTitle title={m.prelaunch_title()} onBack={() => nav('/launch')} />
      </div>
      <Card className="bg-[#131516] border border-[#484b51] px-4 py-4! space-y-6!">
        <SectionWrapper title={m.prelaunch_generate_section()} prefix={1}>
          <p className="text-sm text-[#a0a3a7]">
            {m.prelaunch_generate_description()}
          </p>
          <Button
            onClick={handleGenerate}
            disabled={isSearching}
            className={gradientButtonClass}
          >
            {isSearching ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {m.prelaunch_generating()}
              </>
            ) : (
              m.prelaunch_generate_action()
            )}
          </Button>
        </SectionWrapper>
        <SectionWrapper title={m.prelaunch_lock_section()} prefix={2}>
          <div className="text-[#f68f15] border-none bg-[rgba(246,143,21,0.1)] flex items-start gap-2 p-3">
            <Info className="text-[#f68f15] size-4" />
            <p className="text-[#f68f15] text-xs">
              {m.prelaunch_lock_notice()}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{m.prelaunch_reserved_ca()}</Label>
            <Input
              disabled
              value={predictedAddress ?? ''}
              placeholder={m.prelaunch_generate_placeholder()}
              className="border border-[#84888c] h-10.5 bg-[#18191b]! text-white text-sm"
            />
          </div>
          <Button
            onClick={() => void handleLock()}
            disabled={!canLock}
            className={gradientButtonClass}
          >
            {isReserving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {m.prelaunch_locking()}
              </>
            ) : (
              m.prelaunch_lock_action({ fee: reservationFee ?? '0.001' })
            )}
          </Button>
        </SectionWrapper>
        <SectionWrapper title={m.prelaunch_publish_section()} prefix={3}>
          <div className="border border-[#484b51] p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-y-2">
                <span className="text-sm text-white">
                  {m.prelaunch_available_title()}
                </span>
                <span className="text-[#84888c] text-xs">
                  {m.prelaunch_available_description()}
                </span>
              </div>
              <Button
                onClick={() => void refetch()}
                disabled={isFetching || !address}
                className="border border-[#84888c] bg-transparent h-8 px-4 shrink-0 flex items-center text-white hover:bg-transparent! hover:border-white hover:cursor-pointer"
              >
                {isFetching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <RefreshCcw className="size-3.5" />
                    <span className="text-xs text-white leading-none">
                      {m.prelaunch_refresh()}
                    </span>
                  </>
                )}
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {!address ? (
                <p className="py-6 text-center text-xs text-[#84888c]">
                  {m.prelaunch_connect_wallet()}
                </p>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Spinner className="size-4 text-[#84888c]" />
                  <span className="text-xs text-[#84888c]">
                    {m.prelaunch_loading()}
                  </span>
                </div>
              ) : reservedAddresses.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#84888c]">
                  {m.prelaunch_empty()}
                </p>
              ) : (
                reservedAddresses.map((item) => {
                  const status =
                    RESERVED_ADDRESS_STATUS[item.coinStatus] ??
                    RESERVED_ADDRESS_STATUS[0]
                  const explorerUrl = getExplorerAddressUrl(
                    item.contractAddress,
                  )

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border border-[#2f3737] bg-[#181a1d] px-3 py-2.5"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="break-all font-mono text-sm leading-5 text-white">
                          {item.contractAddress}
                        </span>
                        <span className={`text-xs ${status.className}`}>
                          {status.label()}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={m.prelaunch_copy_address()}
                          onClick={() => handleCopy(item.contractAddress)}
                          className="text-[#84888c] hover:text-white"
                        >
                          {copiedAddress === item.contractAddress ? (
                            <Check className="size-3.5 text-[#7adfa1]" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                        {explorerUrl && (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={m.prelaunch_view_explorer()}
                            className="inline-flex size-7 items-center justify-center text-[#84888c] transition-colors hover:text-[#FFA546]"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </SectionWrapper>
      </Card>
    </div>
  )
}
