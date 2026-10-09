export type TaxChannelKey = 'creator' | 'burn' | 'dividend' | 'liquidity'

export interface TaxChannel {
  key: TaxChannelKey
  label: string
  sublabel: string
  color: string
}

/**
 * Single source of truth for the four tax channels. The colors here are also
 * used by the launch tax-allocation editor, so keep them in sync when adding a
 * channel.
 */
export const TAX_CHANNELS: readonly TaxChannel[] = [
  {
    key: 'creator',
    label: '创作者资金钱包',
    sublabel: '开发者、营销等',
    color: 'rgb(254, 129, 11)',
  },
  {
    key: 'burn',
    label: '銷毀',
    sublabel: '銷毀',
    color: 'rgb(91, 49, 255)',
  },
  {
    key: 'dividend',
    label: '分紅',
    sublabel: '持有者獎勵',
    color: 'rgb(208, 255, 0)',
  },
  {
    key: 'liquidity',
    label: '流動性',
    sublabel: '增加流動性',
    color: 'rgb(22, 217, 217)',
  },
]
