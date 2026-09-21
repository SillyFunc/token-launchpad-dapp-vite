import { parseEther } from 'viem'

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
