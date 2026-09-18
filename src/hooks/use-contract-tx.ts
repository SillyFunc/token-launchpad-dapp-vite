import { usePublicClient, useWriteContract, type Config } from 'wagmi'
import {
  type Abi,
  type Address,
  type Hash,
  type TransactionReceipt,
} from 'viem'
import { writeContract, waitForTransactionReceipt } from 'wagmi/actions'

import { PLATFORM_CHAIN_ID } from '@/lib/web3'

export interface ContractTxParams {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
  value?: bigint
  account?: Address
}

export interface ContractTxResult {
  hash: Hash
  receipt: TransactionReceipt
}

/**
 * Sends a contract write and waits for its receipt. This is the single place
 * where we decide how writes are executed (currently: wagmi action API) and how
 * we wait for confirmation. Callers get both the hash and the receipt so they
 * can parse logs or invalidate caches without knowing the transport details.
 *
 * For React components, prefer `useWriteContractTx` (adds `isPending`).
 */
export async function executeContractTx(
  config: Config,
  params: ContractTxParams,
): Promise<ContractTxResult> {
  const hash = await writeContract(config, {
    ...params,
    chainId: PLATFORM_CHAIN_ID,
  })
  const receipt = await waitForTransactionReceipt(config, {
    hash,
    chainId: PLATFORM_CHAIN_ID,
  })
  return { hash, receipt }
}

/**
 * React wrapper around the same flow. Uses wagmi's `useWriteContract` mutation
 * so `isPending` is tracked for free and double-clicks can be prevented.
 * Components should prefer this over calling `writeContract` directly.
 */
export function useWriteContractTx() {
  const { mutateAsync, isPending } = useWriteContract()
  const publicClient = usePublicClient({ chainId: PLATFORM_CHAIN_ID })

  const execute = async (params: ContractTxParams): Promise<ContractTxResult> => {
    if (!publicClient) {
      throw new Error('No public client available for the platform chain')
    }

    const hash = await mutateAsync({
      ...params,
      chainId: PLATFORM_CHAIN_ID,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return { hash, receipt }
  }

  return { execute, isPending }
}