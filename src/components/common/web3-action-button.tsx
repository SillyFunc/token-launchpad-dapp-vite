import { useState, type MouseEvent } from 'react'
import { useModal } from 'connectkit'
import { RefreshCw, Wallet, Loader2 } from 'lucide-react'
import { useConnection, useSwitchChain } from 'wagmi'

import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

export interface Web3ActionButtonProps
  extends Omit<React.ComponentProps<typeof Button>, 'onClick'> {
  onAction?: (event: MouseEvent<HTMLButtonElement>) => Promise<void> | void
  loading?: boolean
  loadingText?: React.ReactNode
}

export function Web3ActionButton({
  onAction,
  loading = false,
  loadingText,
  disabled,
  children,
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...rest
}: Web3ActionButtonProps) {
  const { address, isConnected, chainId } = useConnection()
  const { setOpen } = useModal()
  const { mutateAsync: switchChainAsync, isPending: isSwitchingPending } =
    useSwitchChain()
  const [localSwitching, setLocalSwitching] = useState(false)
  const isSwitching = isSwitchingPending || localSwitching

  if (!isConnected || !address) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        className={cn('font-bold', className)}
        onClick={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
      >
        <Wallet className="size-4" />
        <span>{m.connect_wallet()}</span>
      </Button>
    )
  }

  if (chainId !== PLATFORM_CHAIN_ID) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={disabled || isSwitching}
        className={cn(
          'border-amber-500/60 bg-amber-950/30 font-bold text-amber-300 hover:bg-amber-900/40 hover:text-amber-200',
          className,
        )}
        onClick={async (event) => {
          event.preventDefault()
          setLocalSwitching(true)
          try {
            await switchChainAsync({ chainId: PLATFORM_CHAIN_ID })
          } catch (error) {
            const message = error instanceof Error ? error.message : ''
            if (!message.toLowerCase().includes('reject')) {
              toast.error(
                m.network_error(),
                m.token_switch_network_failed(),
              )
            }
          } finally {
            setLocalSwitching(false)
          }
        }}
      >
        {isSwitching ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        <span>
          {isSwitching ? m.token_switching_network() : m.token_switch_network()}
        </span>
      </Button>
    )
  }

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    await onAction?.(event)
  }

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={className}
      onClick={(event) => void handleClick(event)}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </Button>
  )
}
