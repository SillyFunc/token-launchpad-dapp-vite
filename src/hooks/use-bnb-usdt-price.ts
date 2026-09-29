import { useDexQuotes } from '@/hooks/use-dex-quotes'

/** Mainnet WBNB. Its USD price is the BNB/USDT rate, including on testnet. */
const MAINNET_WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

export function useBnbUsdtPrice() {
  const { data } = useDexQuotes([MAINNET_WBNB])
  const price = data?.quotes[MAINNET_WBNB.toLowerCase()]?.priceUsd
  return price != null && Number.isFinite(price) && price > 0 ? price : null
}
