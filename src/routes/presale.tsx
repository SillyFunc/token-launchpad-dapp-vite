import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useConnection } from 'wagmi'
import { isAddress, type Address } from 'viem'

import { getTokenByContractAddress, getTokenById } from '@/api/token'
import { PageTitle } from '@/components/common/page-title'
import { BlockedState } from '@/components/presale/blocked-state'
import { PresaleForm } from '@/components/presale/presale-form'
import { RepresaleForm } from '@/components/presale/represale-form'
import { TokenInfoHeader } from '@/components/presale/token-info-header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useTokenGate, type TokenGateResult } from '@/hooks/use-token-gate'
import { m } from '@/paraglide/messages.js'

type PresaleMode = 'setup' | 'edit' | 'blocked'

function resolvePresaleAccess(
  gate: TokenGateResult,
  allowEditAfterRelaunch: boolean,
  userAddress?: string,
): {
  mode: PresaleMode
  reason: string
  isLoading: boolean
} {
  if (!userAddress) {
    return {
      mode: 'blocked',
      reason: m.presale_connect_wallet(),
      isLoading: false,
    }
  }

  if (gate.isLoading) {
    return { mode: 'blocked', reason: '', isLoading: true }
  }

  if (!gate.tokenExists) {
    return {
      mode: 'blocked',
      reason: m.presale_not_issued(),
      isLoading: false,
    }
  }

  if (
    !gate.creatorAddress ||
    gate.creatorAddress.toLowerCase() !== userAddress.toLowerCase()
  ) {
    return {
      mode: 'blocked',
      reason: m.presale_not_creator(),
      isLoading: false,
    }
  }

  const claimed = gate.tokensClaimed || (gate.tokenState ?? 0) >= 2
  const configured = gate.presaleConfigured || gate.presaleEnabled

  if (configured) {
    if (gate.presaleStatus === 1) {
      return {
        mode: 'blocked',
        reason: m.presale_already_active(),
        isLoading: false,
      }
    }
    if (gate.presaleStatus === 2) {
      return {
        mode: 'blocked',
        reason: m.presale_waiting_launch(),
        isLoading: false,
      }
    }
    if (gate.presaleStatus === 3 || claimed) {
      return {
        mode: 'blocked',
        reason: m.presale_already_live(),
        isLoading: false,
      }
    }
    if (gate.presaleStatus === 4) {
      return {
        mode: 'blocked',
        reason:
          gate.bnbAccumulated > 0n
            ? m.presale_refunds_outstanding()
            : m.presale_relaunch_first(),
        isLoading: false,
      }
    }
    if (gate.presaleStatus === 0 && gate.presaleAddress) {
      return allowEditAfterRelaunch
        ? { mode: 'edit', reason: '', isLoading: false }
        : {
            mode: 'blocked',
            reason: m.presale_edit_window_closed(),
            isLoading: false,
          }
    }
    return {
      mode: 'blocked',
      reason: m.presale_already_configured(),
      isLoading: false,
    }
  }

  if (claimed) {
    return {
      mode: 'blocked',
      reason: m.presale_claimed(),
      isLoading: false,
    }
  }

  return { mode: 'setup', reason: '', isLoading: false }
}

export const PresalePage = () => {
  const nav = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { address } = useConnection()
  const [allowEditAfterRelaunch] = useState(
    () =>
      (
        location.state as {
          allowEditAfterRelaunch?: boolean
        } | null
      )?.allowEditAfterRelaunch === true,
  )

  useEffect(() => {
    if (!allowEditAfterRelaunch) return

    void nav(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    })
  }, [allowEditAfterRelaunch, location.pathname, location.search, nav])

  const id = searchParams.get('id')
  const rawAddress = searchParams.get('address') || ''
  const tokenAddress = isAddress(rawAddress)
    ? (rawAddress as Address)
    : undefined
  const hasParam = Boolean(id || tokenAddress)

  const {
    data: token,
    isLoading: isTokenLoading,
    isError: isTokenError,
  } = useQuery({
    queryKey: ['tokenDetail', id || tokenAddress],
    queryFn: ({ signal }) =>
      id
        ? getTokenById(id, signal)
        : getTokenByContractAddress(tokenAddress!, signal),
    enabled: hasParam,
  })

  const effectiveAddress =
    tokenAddress ||
    (isAddress(token?.coinContractAddress ?? '')
      ? (token?.coinContractAddress as Address)
      : undefined)
  const gate = useTokenGate(effectiveAddress, token?.presaleAddress)
  const access = resolvePresaleAccess(
    gate,
    allowEditAfterRelaunch,
    address,
  )
  const isEditMode = access.mode === 'edit'

  return (
    <div className="relative mx-auto flex w-full flex-col pb-28 pt-6">
      <div className="mb-4">
        <PageTitle
          title={isEditMode ? m.presale_edit_title() : m.presale_setup_title()}
          onBack={() => nav('/dashboard')}
        />
      </div>

      <Card className="overflow-visible border border-[#484b51] bg-[#131516] ring-0">
        <CardHeader className="border-b border-b-[#484b51]">
          <TokenInfoHeader
            tokenAddress={effectiveAddress || ''}
            token={token}
            isLoading={isTokenLoading}
            isError={isTokenError}
          />
        </CardHeader>

        <CardContent>
          {access.mode === 'setup' && address && effectiveAddress ? (
            <PresaleForm
              key={token?.id || effectiveAddress}
              token={token}
              tokenAddress={effectiveAddress}
              address={address}
            />
          ) : access.mode === 'edit' &&
            address &&
            gate.presaleAddress &&
            effectiveAddress ? (
            <RepresaleForm
              key={`${effectiveAddress}-${gate.presaleAddress}-${String(gate.hardCap)}-${String(gate.softCap)}`}
              token={token ?? null}
              presaleAddress={gate.presaleAddress}
              address={address}
              gate={gate}
              onSuccess={() => nav('/dashboard')}
            />
          ) : (
            <BlockedState
              title={
                isEditMode || gate.presaleConfigured
                  ? m.presale_blocked_edit_title()
                  : undefined
              }
              reason={access.reason}
              isLoading={access.isLoading || isTokenLoading}
              primaryAction={{
                label: m.presale_go_dashboard(),
                to: '/dashboard',
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
