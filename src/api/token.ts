import { postForm } from '@/lib/http/client'

type Nullable<T> = T | null
type NumericValue = string | number

export interface TokenDetail {
  id: number
  name: string
  symbol: string
  meta: Nullable<string>
  coinImg: Nullable<string>
  website: Nullable<string>
  telegram: Nullable<string>
  twitter: Nullable<string>
  creatorAddress: Nullable<string>
  address: Nullable<string>
  coinContractAddress: Nullable<string>
  presaleAddress: Nullable<string>
  feeRecipient: Nullable<string>
  buyTax: Nullable<number>
  sellTax: Nullable<number>
  taxDuration: Nullable<NumericValue>
  antiFarmerDuration: Nullable<NumericValue>
  createTime: Nullable<string>
  launchType: Nullable<number>
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
