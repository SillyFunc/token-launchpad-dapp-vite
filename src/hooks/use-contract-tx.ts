import {
  useConnection,
  usePublicClient,
  useWriteContract,
  type Config,
} from 'wagmi'
import {
  type Abi,
  type Address,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
} from 'viem'
import {
  getConnection,
  getPublicClient,
  writeContract,
  waitForTransactionReceipt,
} from 'wagmi/actions'

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

/** Headroom over the RPC estimate, in percent. */
const GAS_BUFFER_PERCENT = 120n

/**
 * Estimates gas on our own RPC and adds a buffer. Passing `gas` to the wallet
 * means it no longer has to estimate on its own node — some wallets
 * (TokenPocket) fail that estimate and fall back to a default gas limit, which
 * can be too low for heavy calls like `launch()`. A transaction that would
 * revert also fails here, before the wallet opens.
 */
async function estimateGasWithBuffer(
  publicClient: PublicClient | undefined,
  params: ContractTxParams,
  account: Address | undefined,
): Promise<bigint> {
  if (!publicClient) {
    throw new Error('No public client available for the platform chain')
  }
  if (!account) {
    throw new Error('No connected account to estimate gas for')
  }

  const gas = await publicClient.estimateContractGas({ ...params, account })
  return (gas * GAS_BUFFER_PERCENT) / 100n
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
  const gas = await estimateGasWithBuffer(
    getPublicClient(config, { chainId: PLATFORM_CHAIN_ID }),
    params,
    params.account ?? getConnection(config).address,
  )
  const hash = await writeContract(config, {
    ...params,
    gas,
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
  const { address } = useConnection()

  const execute = async (params: ContractTxParams): Promise<ContractTxResult> => {
    if (!publicClient) {
      throw new Error('No public client available for the platform chain')
    }

    const gas = await estimateGasWithBuffer(
      publicClient,
      params,
      params.account ?? address,
    )
    const hash = await mutateAsync({
      ...params,
      gas,
      chainId: PLATFORM_CHAIN_ID,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return { hash, receipt }
  }

  return { execute, isPending }
}
