import { postForm } from '@/lib/http/client'

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
  launchType: string
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
