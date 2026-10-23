import { formatDecimalText, splitSubscriptPrice } from '@/lib/format'

export interface PriceTextProps {
  value: number | null
  /** USD renders as `$0.0₆7933`, BNB as `0.0₆7933 BNB`. */
  unit?: 'USD' | 'BNB'
}

/**
 * Per-token price. Very small prices render the leading-zero count as a
 * subscript (e.g. $0.0₆7933), so the value stays complete without widening its
 * container. The full decimal is kept in the title and for screen readers.
 */
export const PriceText: React.FC<PriceTextProps> = ({ value, unit = 'USD' }) => {
  if (value === null) return <>--</>

  const prefix = unit === 'USD' ? '$' : ''
  const suffix = unit === 'BNB' ? ' BNB' : ''
  const fullText = `${prefix}${formatDecimalText(value)}${suffix}`
  const split = splitSubscriptPrice(value)

  if (!split) {
    return (
      <span title={fullText}>
        {prefix}
        {formatDecimalText(value, 5)}
        {suffix}
      </span>
    )
  }

  return (
    <span title={fullText}>
      {/* A subscript reads as separate numbers aloud, so screen readers get the full decimal. */}
      <span aria-hidden="true">
        {prefix}0.0
        <sub className="text-[0.6em] leading-none">{split.zeros}</sub>
        {split.digits}
        {suffix}
      </span>
      <span className="sr-only">{fullText}</span>
    </span>
  )
}
