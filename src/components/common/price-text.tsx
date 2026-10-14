import { formatDecimalText, splitSubscriptPrice } from '@/lib/format'

export interface PriceTextProps {
  value: number | null
}

/**
 * USD price. Very small prices render the leading-zero count as a subscript
 * (e.g. $0.0₆7933), so the value stays complete without widening its container.
 */
export const PriceText: React.FC<PriceTextProps> = ({ value }) => {
  if (value === null) return <>--</>
  const split = splitSubscriptPrice(value)
  if (!split) return <>${formatDecimalText(value, 5)}</>
  return (
    <>
      $0.0
      <sub className="text-[0.6em] leading-none">{split.zeros}</sub>
      {split.digits}
    </>
  )
}
