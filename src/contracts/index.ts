import { PLATFORM_CHAIN_ID } from '@/lib/web3'

import { buybackVaultFactoryAbi } from './abis/buyback-vault-factory'
import { coordinatorFactoryAbi } from './abis/coordinator-factory'
import { addresses } from './addresses'

export { addresses }
export type { DeploymentAddresses, SupportedChainId } from './addresses'
export { buybackVaultAbi } from './abis/buyback-vault'
export { buybackVaultFactoryAbi } from './abis/buyback-vault-factory'
export { coordinatorFactoryAbi } from './abis/coordinator-factory'
export { flapTaxTokenV3Abi } from './abis/flap-tax-token-v3'
export { presaleAbi } from './abis/presale'

/**
 * Deployment accessors. Resolved lazily per call instead of at module scope so
 * the platform chain can be switched without touching import order.
 */
export function getDeployment(chainId: number = PLATFORM_CHAIN_ID) {
  const deployment = addresses[chainId as keyof typeof addresses]
  if (!deployment) {
    throw new Error(`No deployment recorded for chain ${chainId}`)
  }
  return deployment
}

export function getCoordinatorFactory(chainId: number = PLATFORM_CHAIN_ID) {
  return {
    address: getDeployment(chainId).coordinatorFactory,
    abi: coordinatorFactoryAbi,
  }
}

export function getBuybackVaultFactory(chainId: number = PLATFORM_CHAIN_ID) {
  const deployment = getDeployment(chainId)
  if (!('buybackVaultFactory' in deployment)) {
    throw new Error(`Chain ${chainId} has no buyback vault deployment`)
  }
  return {
    address: deployment.buybackVaultFactory,
    abi: buybackVaultFactoryAbi,
  }
}
