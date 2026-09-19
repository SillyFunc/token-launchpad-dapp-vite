import { getAddress, isAddress, type Address } from 'viem'

import type { BoardItemResponse } from '@/api/board'
import type { TokenGateResult } from '@/hooks/use-token-gate'
import { formatBnbAmount, formatDecimal, formatTokenAmount } from '@/lib/format'
import { isPredictedTokenAddress } from '@/lib/vanity-salt'
import { getPresaleProgress } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

export type TokenStage =
  | 'notIssued'
  | 'syncing'
  | 'prelaunch'
  | 'presale'
  | 'waitingLaunch'
  | 'live'
  | 'failed'

export const stageStyles: Record<
  TokenStage,
  { label: () => string; className: string }
> = {
  notIssued: {
    label: () => m.dashboard_token_not_issued(),
    className: 'border-neutral-600 text-neutral-300',
  },
  syncing: {
    label: () => m.dashboard_token_syncing(),
    className: 'border-sky-500/40 text-sky-300',
  },
  prelaunch: {
    label: () => m.dashboard_token_prelaunch(),
    className: 'border-amber-500/40 text-amber-300',
  },
  presale: {
    label: () => m.dashboard_token_presale(),
    className: 'border-emerald-500/40 text-emerald-300',
  },
  waitingLaunch: {
    label: () => m.dashboard_token_waiting_launch(),
    className: 'border-violet-500/40 text-violet-300',
  },
  live: {
    label: () => m.dashboard_token_live(),
    className: 'border-green-500/40 text-green-300',
  },
  failed: {
    label: () => m.dashboard_token_failed(),
    className: 'border-rose-500/40 text-rose-300',
  },
}

/** Gate shape needed to derive a stage. Kept structural so it stays decoupled. */
export interface TokenGateSnapshot {
  tokenAddress?: Address
  isLoading: boolean
  tokenExists: boolean
  tokenState?: number
  presaleStatus?: number
  presaleConfigured: boolean
  presaleEnabled: boolean
  tokensClaimed: boolean
}

export function getStage(gate: TokenGateSnapshot): TokenStage {
  if (!gate.tokenAddress) return 'notIssued'
  // Background refetch must not flip the badge or hide actions.
  if (gate.isLoading) return 'syncing'
  if (!gate.tokenExists) return 'notIssued'

  const claimed = gate.tokensClaimed || (gate.tokenState ?? 0) >= 2
  if (claimed) return 'live'
  if (gate.presaleStatus === 4) return 'failed'
  if (gate.presaleStatus === 2) return 'waitingLaunch'
  if (gate.presaleStatus === 1) return 'presale'
  if (
    (gate.presaleConfigured || gate.presaleEnabled) &&
    gate.presaleStatus === undefined
  ) {
    return 'syncing'
  }
  return 'prelaunch'
}

export function getTokenAddress(token: BoardItemResponse): Address | undefined {
  const candidates = [token.coinContractAddress, token.contractAddress]

  const address = candidates.find((candidate) => isAddress(candidate))
  return address ? getAddress(address) : undefined
}

export function getReservedAddress(
  token: BoardItemResponse,
  issuedTokenAddress?: Address,
): Address | undefined {
  if (
    issuedTokenAddress ||
    !isPredictedTokenAddress(token.salt, token.coinContractAddress)
  ) {
    return undefined
  }

  return getAddress(token.coinContractAddress)
}

/**
 * Everything a dashboard card needs to render, derived once by the dispatcher
 * so both card variants stay presentational and share one on-chain read.
 */
export interface TokenCardState {
  token: BoardItemResponse
  gate: TokenGateResult
  tokenAddress?: Address
  reservedAddress?: Address
  stage: TokenStage
  tokenName: string
  tokenSymbol: string
  buyTax?: number
  sellTax?: number
  totalSupply: string
  presalePrice: string
  walletLimit: string
  raised: string
  tokenAllocation: string
  presaleProgress: number
  softCapProgress: number
  hardCapProgress: number
  hasConfiguredPresale: boolean
}

export function buildTokenCardState(
  token: BoardItemResponse,
  gate: TokenGateResult,
  tokenAddress: Address | undefined,
  reservedAddress: Address | undefined,
): TokenCardState {
  const tokenSymbol = gate.tokenSymbol || token.symbol || '--'
  const hasConfiguredPresale = gate.presaleConfigured || gate.presaleEnabled

  return {
    token,
    gate,
    tokenAddress,
    reservedAddress,
    stage: getStage(gate),
    tokenName: gate.tokenName || token.name || '--',
    tokenSymbol,
    buyTax:
      token.buyTax || token.buyTax === 0
        ? token.buyTax
        : gate.buyTaxBps === undefined
          ? undefined
          : gate.buyTaxBps / 100,
    sellTax:
      token.sellTax || token.sellTax === 0
        ? token.sellTax
        : gate.sellTaxBps === undefined
          ? undefined
          : gate.sellTaxBps / 100,
    totalSupply:
      gate.totalSupply > 0n
        ? formatTokenAmount(gate.totalSupply, gate.tokenDecimals)
        : formatNumberValue(token.totalSupply),
    presalePrice:
      gate.presalePrice > 0n
        ? formatBnbAmount(gate.presalePrice)
        : token.presaleTokenPrice > 0
          ? `${formatDecimal(token.presaleTokenPrice)} BNB`
          : '--',
    walletLimit:
      gate.maxBuyPerWallet > 0n
        ? formatBnbAmount(gate.maxBuyPerWallet)
        : token.maxBuyPerWallet > 0
          ? `${formatDecimal(token.maxBuyPerWallet)} BNB`
          : '--',
    raised:
      gate.presaleAddress && gate.bnbAccumulated > 0n
        ? formatBnbAmount(gate.bnbAccumulated)
        : '--',
    tokenAllocation:
      gate.presaleShare > 0n
        ? `${formatTokenAmount(gate.presaleShare, gate.tokenDecimals)} ${tokenSymbol}`
        : token.tokenAmount > 0
          ? `${formatDecimal(token.tokenAmount)} ${tokenSymbol}`
          : '--',
    presaleProgress: getPresaleProgress(
      gate.tokensSubscribed,
      gate.presaleShare,
    ),
    softCapProgress: getPresaleProgress(gate.bnbAccumulated, gate.softCap),
    hardCapProgress: getPresaleProgress(gate.bnbAccumulated, gate.hardCap),
    hasConfiguredPresale,
  }
}

/** Which card variant owns the token, based on how it is launched. */
export type TokenCardMode = 'unissued' | 'standalone' | 'presale'

/**
 * `hasConfiguredPresale` is the documented mode signal
 * (docs/frontend-integration-testnet.md §4.1); the explicit stage list keeps a
 * presale that already reached `failed` / `presale` / `waitingLaunch` on the
 * presale card even if the config flag has not caught up yet.
 */
export function getCardMode(state: {
  stage: TokenStage
  hasConfiguredPresale: boolean
}): TokenCardMode {
  // A token that does not exist on-chain has no launch mode yet, so it cannot
  // be classified as either path.
  if (state.stage === 'notIssued') return 'unissued'
  if (state.hasConfiguredPresale) return 'presale'
  if (
    state.stage === 'failed' ||
    state.stage === 'presale' ||
    state.stage === 'waitingLaunch'
  ) {
    return 'presale'
  }

  return 'standalone'
}

export function formatDays(value: number | undefined) {
  return value === undefined || value === null || value <= 0
    ? '--'
    : `${formatDecimal(value, { maximumFractionDigits: 2 })}d`
}

export function formatTax(value: number | undefined, fallback?: number) {
  const resolved = value ?? fallback
  return resolved === undefined ? '--' : `${formatDecimal(resolved)}%`
}

export function formatNumberValue(value: number | undefined) {
  return value === undefined || value === null ? '--' : formatDecimal(value)
}
