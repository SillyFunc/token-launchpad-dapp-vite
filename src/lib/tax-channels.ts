import { m } from '@/paraglide/messages.js'

export type TaxChannelKey = 'creator' | 'burn' | 'dividend' | 'liquidity'

export interface TaxChannel {
  key: TaxChannelKey
  /** Message getters, so the text follows the current locale. */
  label: () => string
  sublabel: () => string
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
    label: m.dashboard_tax_channel_creator,
    sublabel: m.tax_channel_creator_sublabel,
    color: 'rgb(254, 129, 11)',
  },
  {
    key: 'burn',
    label: m.dashboard_tax_channel_burn,
    sublabel: m.dashboard_tax_channel_burn,
    color: 'rgb(91, 49, 255)',
  },
  {
    key: 'dividend',
    label: m.dashboard_tax_channel_dividend,
    sublabel: m.tax_channel_dividend_sublabel,
    color: 'rgb(208, 255, 0)',
  },
  {
    key: 'liquidity',
    label: m.dashboard_tax_channel_liquidity,
    sublabel: m.tax_channel_liquidity_sublabel,
    color: 'rgb(22, 217, 217)',
  },
]
