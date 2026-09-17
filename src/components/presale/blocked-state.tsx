import { Link } from 'react-router'
import { Loader2, ShieldX, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages.js'

interface BlockedAction {
  label: string
  to: string
}

interface BlockedStateProps {
  title?: string
  reason: string
  isLoading?: boolean
  primaryAction?: BlockedAction
}

export function BlockedState({
  title,
  reason,
  isLoading = false,
  primaryAction,
}: BlockedStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
        {isLoading ? (
          <Loader2 className="size-7 animate-spin" />
        ) : (
          <ShieldX className="size-7" />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-bold text-white">
          {isLoading
            ? m.presale_checking_chain()
            : title || m.presale_blocked_title()}
        </h3>
        {!isLoading && reason && (
          <p className="max-w-sm text-xs leading-relaxed text-neutral-400">
            {reason}
          </p>
        )}
      </div>

      {!isLoading && primaryAction && (
        <Button
          className="mt-2 h-10 w-full max-w-xs"
          render={<Link to={primaryAction.to} />}
        >
          <ArrowLeft className="size-3.5" />
          {primaryAction.label}
        </Button>
      )}
    </div>
  )
}
