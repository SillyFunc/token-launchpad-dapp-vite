import { formatEther, parseEther } from 'viem'

export type BuybackVaultMode = 'token' | 'lp'
export type BuybackVaultTrigger = 'time' | 'balance' | 'time-and-balance'
export type BuybackVaultIntervalUnit = 'minutes' | 'hours' | 'days'

export interface BuybackVaultDraft {
  selected: boolean
  buybackMode: BuybackVaultMode
  executionCondition: BuybackVaultTrigger
  intervalUnit: BuybackVaultIntervalUnit
  firstExecuteAt: string
  triggerAmount: string
  interval: string
  buybackAmount: string
}

export interface EncodedBuybackConfig {
  mode: number
  trigger: number
  firstExecuteAt: bigint
  intervalSeconds: bigint
  triggerAmount: bigint
  buybackAmount: bigint
}

const BUYBACK_AMOUNT_UNIT = parseEther('0.001')
const MAX_BUYBACK_AMOUNT = parseEther('10')
const MAX_TRIGGER_AMOUNT = parseEther('1000')
const MIN_INTERVAL_SECONDS = 60n
const MAX_INTERVAL_SECONDS = 31_536_000n
const INTERVAL_SECONDS: Record<BuybackVaultIntervalUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
}

export function defaultBuybackVaultDraft(): BuybackVaultDraft {
  return {
    selected: false,
    buybackMode: 'token',
    executionCondition: 'time',
    intervalUnit: 'minutes',
    firstExecuteAt: '',
    triggerAmount: '1',
    interval: '1',
    buybackAmount: '0.001',
  }
}

/** Vault params as echoed back by the backend (same names as the API payload). */
export interface BuybackVaultParams {
  buybackVaultEnabled?: number
  mode?: number
  triggerType?: number
  firstExecuteAt?: number
  intervalSeconds?: number
  triggerAmount?: string
  buybackAmount?: string
}

const TRIGGER_CONDITIONS: BuybackVaultTrigger[] = [
  'time',
  'balance',
  'time-and-balance',
]

function unixSecondsToUtc8DatetimeLocal(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  // The datetime-local input displays UTC+8 wall time; shift the epoch before
  // reading ISO fields (inverse of utc8DatetimeLocalToUnixSeconds).
  return new Date(seconds * 1000 + 8 * 3600 * 1000).toISOString().slice(0, 16)
}

export function defaultFirstExecuteAt(nowMs = Date.now()): string {
  return unixSecondsToUtc8DatetimeLocal(Math.floor(nowMs / 1000) + 3_600)
}

function splitIntervalSeconds(totalSeconds: number): {
  interval: string
  intervalUnit: BuybackVaultIntervalUnit
} {
  // Prefer the largest unit that divides evenly; the contract guarantees a
  // whole-minute interval, so minutes always work as the final fallback.
  if (totalSeconds >= 86_400 && totalSeconds % 86_400 === 0) {
    return { interval: String(totalSeconds / 86_400), intervalUnit: 'days' }
  }
  if (totalSeconds >= 3_600 && totalSeconds % 3_600 === 0) {
    return { interval: String(totalSeconds / 3_600), intervalUnit: 'hours' }
  }
  if (totalSeconds >= 60) {
    return {
      interval: String(Math.round(totalSeconds / 60)),
      intervalUnit: 'minutes',
    }
  }
  return { interval: '1', intervalUnit: 'minutes' }
}

function weiToBnbString(value: string): string {
  try {
    return formatEther(BigInt(value))
  } catch {
    return '0'
  }
}

/**
 * Rebuilds the form draft from backend-echoed vault params (the same values
 * the launch form submitted). Records saved before vault support existed
 * carry no fields and fall back to the defaults.
 */
export function draftFromVaultParams(
  params: BuybackVaultParams,
): BuybackVaultDraft {
  const defaults = defaultBuybackVaultDraft()
  if (params.buybackVaultEnabled == null) return defaults

  const intervalSeconds = Number(params.intervalSeconds ?? 0)
  const { interval, intervalUnit } =
    intervalSeconds > 0
      ? splitIntervalSeconds(intervalSeconds)
      : { interval: defaults.interval, intervalUnit: defaults.intervalUnit }

  return {
    selected: params.buybackVaultEnabled === 1,
    buybackMode: Number(params.mode) === 1 ? 'lp' : 'token',
    executionCondition:
      TRIGGER_CONDITIONS[Number(params.triggerType ?? 0)] ?? 'time',
    intervalUnit,
    firstExecuteAt: unixSecondsToUtc8DatetimeLocal(
      Number(params.firstExecuteAt ?? 0),
    ),
    triggerAmount: params.triggerAmount
      ? weiToBnbString(params.triggerAmount)
      : defaults.triggerAmount,
    interval,
    buybackAmount: params.buybackAmount
      ? weiToBnbString(params.buybackAmount)
      : defaults.buybackAmount,
  }
}

function utc8DatetimeLocalToUnixSeconds(value: string): bigint {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    throw new Error('InvalidFirstExecuteTime')
  }
  const normalized = value.length === 16 ? `${value}:00` : value.slice(0, 19)
  const ms = Date.parse(`${normalized}+08:00`)
  if (!Number.isFinite(ms)) {
    throw new Error('InvalidFirstExecuteTime')
  }
  return BigInt(Math.floor(ms / 1000))
}

function parseBnbAmount(value: string, errorName: string): bigint {
  try {
    return parseEther(value as `${number}`)
  } catch {
    throw new Error(errorName)
  }
}

export function encodeBuybackConfig(
  draft: BuybackVaultDraft,
): EncodedBuybackConfig {
  const intervalCount = Number(draft.interval)
  if (!Number.isInteger(intervalCount) || intervalCount < 1) {
    throw new Error('InvalidInterval')
  }

  const intervalSeconds = BigInt(
    intervalCount * INTERVAL_SECONDS[draft.intervalUnit],
  )
  if (
    intervalSeconds < MIN_INTERVAL_SECONDS ||
    intervalSeconds > MAX_INTERVAL_SECONDS
  ) {
    throw new Error('InvalidInterval')
  }

  const buybackAmount = parseBnbAmount(draft.buybackAmount, 'InvalidBuybackAmount')
  if (
    buybackAmount < BUYBACK_AMOUNT_UNIT ||
    buybackAmount > MAX_BUYBACK_AMOUNT ||
    buybackAmount % BUYBACK_AMOUNT_UNIT !== 0n
  ) {
    throw new Error('InvalidBuybackAmount')
  }

  const trigger =
    draft.executionCondition === 'time'
      ? 0
      : draft.executionCondition === 'balance'
        ? 1
        : 2
  const includesTime = trigger === 0 || trigger === 2
  const includesBalance = trigger === 1 || trigger === 2

  const firstExecuteAt = includesTime
    ? utc8DatetimeLocalToUnixSeconds(draft.firstExecuteAt)
    : 0n

  let triggerAmount = 0n
  if (includesBalance) {
    triggerAmount = parseBnbAmount(draft.triggerAmount, 'InvalidTriggerAmount')
    if (triggerAmount < buybackAmount || triggerAmount > MAX_TRIGGER_AMOUNT) {
      throw new Error('InvalidTriggerAmount')
    }
  }

  return {
    mode: draft.buybackMode === 'lp' ? 1 : 0,
    trigger,
    firstExecuteAt,
    intervalSeconds,
    triggerAmount,
    buybackAmount,
  }
}
