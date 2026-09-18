import { addresses, contracts } from '@sillyfunc/launchpad-contracts'

import { PLATFORM_CHAIN_ID } from '@/lib/web3'

/**
 * Deployment accessors. Resolved lazily per call instead of at module scope so
 * the platform chain can be switched without touching import order.
 */
export function getDeployment(chainId: number = PLATFORM_CHAIN_ID) {
  return addresses[chainId as keyof typeof addresses]
}

export function getCoordinatorFactory(chainId: number = PLATFORM_CHAIN_ID) {
  return contracts[chainId as keyof typeof contracts].coordinatorFactory
}
