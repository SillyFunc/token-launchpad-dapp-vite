import { get, postForm, postMultipart } from '@/lib/http/client'

export interface TokenDetail {
  id: number
  name: string
  symbol: string
  meta: string
  coinImg: string
  website: string
  telegram: string
  twitter: string
  creatorAddress: string
  address: string
  coinContractAddress: string
  presaleAddress: string
  feeRecipient: string
  buyTax: number
  sellTax: number
  taxDuration: number
  antiFarmerDuration: number
  createTime: string
  launchType: number | string
  salt?: string
  zhIntroduction?: string
  enIntroduction?: string
  hardcap?: number | string
  softcap?: number | string
  soft?: number | string
  maxBuyPerWallet?: number | string
  presaleTokenPrice?: number | string
  vestingDelay?: number | string
  vestingRate?: number | string
  slippage?: number | string
  creatorBuyTokens?: number | string
  creatorBuyBnb?: number | string
}

export interface SaveTokenParams {
  name: string
  coinImg: string
  symbol: string
  meta: string
  buyTax: number
  sellTax: number
  feeRecipient: string
  taxDuration: number
  antiFarmerDuration: number
  liqExpectedOutputAmount: number
  salt?: string
  /** 选择预留 CA 时传入对应的代币合约地址 */
  coinContractAddress?: string
  creationFee?: number
  launchType: number
  website: string
  telegram: string
  twitter: string
  address: string
  message: string
  signature: string
  presaleTokenPrice?: string | number
  maxBuyPerWallet?: string | number
  hardcap?: string | number
  softcap?: string | number
  minLiquidityAmount?: string | number
  startTime?: number | string
  endTime?: number | string
  vestingDelay?: number | string
  vestingRate?: number | string
  slippage?: number | string
  creatorBuyTokens?: string | number
  creatorBuyBnb?: string | number
}

export interface ParseTxHashParams {
  id: number | string
  hash: string
  address: string
  message: string
  signature: string
}

export interface SaveTokenSaltParams {
  contractAddress: string
  salt: string
  address: string
  message: string
  signature: string
  txHash: string
}

export type ReservedAddressItem = {
  id: number
  contractAddress: string
  salt: string
  status: number
  coinStatus: 0 | 1 | 2
}

export function getTokenByContractAddress(
  address: string,
  signal?: AbortSignal,
) {
  return postForm<TokenDetail>(
    'deposit/exSwap/swapCoinIssuedDetail',
    { address },
    signal,
  )
}

export function getTokenById(id: string | null, signal?: AbortSignal) {
  return postForm<TokenDetail>(
    'deposit/exSwap/swapCoinIssuedDetail',
    { id },
    signal,
  )
}

export function uploadTokenLogo(file: File, signal?: AbortSignal) {
  const formData = new FormData()
  formData.append('file', file)
  return postMultipart<string>(
    'deposit/common/upload/local/image',
    formData,
    signal,
  )
}

export function saveTokenInfo(params: SaveTokenParams, signal?: AbortSignal) {
  return postForm<TokenDetail>(
    'deposit/exSwap/swapCoinIssuedAdd',
    params,
    signal,
  )
}

export function updateTokenInfo(
  params: { id: number | string } & SaveTokenParams,
  signal?: AbortSignal,
) {
  return postForm<TokenDetail>(
    'deposit/exSwap/swapCoinIssuedUpdateCoinssued',
    params,
    signal,
  )
}

export function parseTxHash(params: ParseTxHashParams, signal?: AbortSignal) {
  return postForm<void>('deposit/exSwap/swapCoinIssuedUpdate', params, signal)
}

export function saveTokenSalt(
  params: SaveTokenSaltParams,
  signal?: AbortSignal,
) {
  return postForm<void>('deposit/coinIssueSetting/insertSalt', params, signal)
}

export function getReservedAddressesByUser(
  address: string,
  signal?: AbortSignal,
) {
  return get<ReservedAddressItem[]>(
    'deposit/coinIssueSetting/getSaltList',
    { address },
    signal,
  )
}
