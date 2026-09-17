import { formatDecimal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface PresaleProgressProps {
  label: string
  value: number
  detail: string
  highlight?: boolean
  showMarker?: boolean
  showPercentage?: boolean
  showDivider?: boolean
}

export function PresaleProgress({
  label,
  value,
  detail,
  highlight = false,
  showMarker = false,
  showPercentage = false,
  showDivider = false,
}: PresaleProgressProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        showDivider && 'border-t border-white/5 pt-2 first:border-t-0 first:pt-0',
      )}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span
          className={cn(
            'min-w-0 text-[#A0A3A7]',
            showMarker && 'flex items-center gap-1.5',
          )}
        >
          {showMarker && (
            <span
              className="size-1.5 shrink-0 bg-[#FFA546]"
              aria-hidden="true"
            />
          )}
          <span className={cn(showMarker && 'truncate')}>{label}</span>
        </span>
        <span
          className={cn(
            'min-w-0 truncate text-right font-mono',
            showMarker ? 'shrink-0 text-neutral-300' : 'text-foreground',
          )}
        >
          {detail}
          {showPercentage && (
            <>
              {' '}
              <strong className={highlight ? 'text-[#0ECB81]' : 'text-[#FFA546]'}>
                {formatDecimal(value, { maximumFractionDigits: 2 })}%
              </strong>
            </>
          )}
        </span>
      </div>
      <Progress value={value} className="w-full" />
    </div>
  )
}
