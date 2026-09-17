import { postForm } from '@/lib/http/client'
import type { PageParams, PageResult } from './types'

export interface BoardListParams extends PageParams {
  name?: string
  address?: string
  model?: 0 | 1
  canSwap?: 0 | 1
}

export type BoardItemResponse = {
  id: number
  hash: string
  name: string
  address: string
  creatorAddress: string
  contractAddress: string
  coinContractAddress: string
  chatAt: string
  unit: number
  minTxFee: number
  maxTxFee: number
  marketCap: number
  feeLogicType: number
  secretAddress: string
  fullName: string
  coinPrecision: string
  coinImg: string
  issuePrice: number
  totalIssuance: number
  calculationRate: number
  issuanceCycle: number
  issuer: string
  officialWebsite: string
  whitePaperLink: string
  contractInformation: string
  releaseDeclaration: string
  minHoldBalance: number
  status: number
  coinStatus: number
  auditRemark: string
  auditTime: string
  createTime: string
  realPrice: number
  presalePrice: number
  feeRecipient: string
  network: string
  tradePrice: number
  totalSupply: number
  maxTotalNum: number
  softCapRate: number
  presaleMaxNum: number
  insideMaxNum: number
  backingReceiver: string
  startTime: string
  endTime: string
  lgeCopies: number
  rate: number
  vestingDis: number
  hardcap: number
  softcap: number
  tokenAmount: number
  maxBuyPerWallet: number
  vestingDelay: number
  vestingRate: number
  backingShare: number
  userLpShare: number
  devLpShare: number
  devLpReceiver: string
  basePresaleCount: number
  website: string
  telegram: string
  twitter: string
  withdrawFeeRate: number
  pledgeContractAddress: string
  minWithdrawAmount: number
  maxWithdrawAmount: number
  zhIntroduction: string
  enIntroduction: string
  thb: string
  soft: number
  remainSupply: string
  domesticPrice: number
  presaleAddress: string
  top: number
  isInternalExchange: number
  launchType: number
  canSwap: number
  tradeAddress: string
  backingPoolAddress: string
  symbol: string
  meta: string
  buyTax: number
  sellTax: number
  taxDuration: number
  antiFarmerDuration: number
  liqExpectedOutputAmount: string
  salt: string
  creationFee: string
  presaleTokenPrice: number
  minLiquidityAmount: number
  slippage: number
  creatorBuyTokens: number
}

export function listBoard(params: BoardListParams, signal?: AbortSignal) {
  return postForm<PageResult<BoardItemResponse>>(
    'deposit/exSwap/swapCoinIssuedPage',
    params,
    signal,
  )
}
