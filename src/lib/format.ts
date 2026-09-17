import { formatEther, formatUnits } from 'viem'
import { getLocale } from '@/paraglide/runtime.js'

function locale() {
  return getLocale() === 'zh-Hant' ? 'zh-Hant' : 'en'
}

function toFiniteNumber(value: string | number): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function formatDecimal(
  value: string | number,
  options?: Intl.NumberFormatOptions,
) {
  const number = toFiniteNumber(value)
  if (number === null) return '--'
  if (number !== 0 && Math.abs(number) < 0.000001) {
    return number.toExponential(4)
  }

  return new Intl.NumberFormat(locale(), {
    maximumFractionDigits: 6,
    maximumSignificantDigits: 8,
    ...options,
  }).format(number)
}

export function formatCompactNumber(value: string | number) {
  const number = toFiniteNumber(value)
  if (number === null) return '--'

  return new Intl.NumberFormat(locale(), {
    notation: Math.abs(number) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 2,
    maximumSignificantDigits: 6,
  }).format(number)
}

export function formatTokenAmount(value: bigint, decimals = 18) {
  return formatCompactNumber(formatUnits(value, decimals))
}

export function formatBnbAmount(value: bigint) {
  return `${formatDecimal(formatEther(value))} BNB`
}

export function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatDecimal(value, { maximumFractionDigits: 2 })}%`
}

export function formatDuration(seconds: bigint) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return '--'
  if (value % 86_400 === 0) return `${value / 86_400}d`
  if (value % 3_600 === 0) return `${value / 3_600}h`
  if (value % 60 === 0) return `${value / 60}m`
  return `${value}s`
}
