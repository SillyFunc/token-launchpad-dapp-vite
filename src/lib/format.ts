import { formatEther, formatUnits } from 'viem'
import { getLocale } from '@/paraglide/runtime.js'

function locale() {
  return getLocale() === 'zh-Hant' ? 'zh-Hant' : 'en'
}

function toFiniteNumber(value: string | number): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatSmallNumber(number: number, significantDigits: number) {
  const cleaned = Number(number.toPrecision(significantDigits))
  const decimals = Math.min(
    20,
    Math.max(
      0,
      significantDigits - 1 - Math.floor(Math.log10(Math.abs(cleaned))),
    ),
  )
  const text = cleaned.toFixed(decimals)
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

export function formatDecimal(
  value: string | number,
  options?: Intl.NumberFormatOptions,
) {
  const number = toFiniteNumber(value)
  if (number === null) return '--'
  if (number !== 0 && Math.abs(number) < 0.000001) {
    return formatSmallNumber(number, 6)
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
  if (number !== 0 && Math.abs(number) < 0.0001) {
    return formatSmallNumber(number, 6)
  }

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

export function formatTokenSupply(supply: bigint, decimals = 18) {
  return formatCompactNumber(formatUnits(supply, decimals))
}

export function formatDecimalText(
  value: string | number | null | undefined,
  maxSignificantDigits = 12,
) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '--'
  if (n === 0) return '0'
  const cleaned = Number(n.toPrecision(maxSignificantDigits))
  const decimals = Math.min(
    20,
    Math.max(
      0,
      maxSignificantDigits - 1 - Math.floor(Math.log10(Math.abs(cleaned))),
    ),
  )
  const text = cleaned.toFixed(decimals)
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

/**
 * Splits a very small price into its leading zeros and significant digits, so the
 * UI can render the zero count as a subscript (e.g. $0.0₆7933). Returns null for
 * prices that read fine in plain decimal form.
 */
export function splitSubscriptPrice(
  value: string | number | null | undefined,
  significantDigits = 4,
): { zeros: number; digits: string } | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0 || n >= 0.0001) return null
  // Fixed-point digits after the decimal point, with no exponent notation.
  const fixed = n.toFixed(20).replace(/0+$/, '')
  const [, fraction = ''] = fixed.split('.')
  const zeros = fraction.length - fraction.replace(/^0+/, '').length
  const digits = fraction.slice(zeros, zeros + significantDigits)
  if (digits === '') return null
  return { zeros, digits }
}

export function formatShortAddress(address: string) {
  if (!address) return '--'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatDuration(seconds: bigint) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return '--'
  if (value % 86_400 === 0) return `${value / 86_400}d`
  if (value % 3_600 === 0) return `${value / 3_600}h`
  if (value % 60 === 0) return `${value / 60}m`
  return `${value}s`
}
