import { ArrowLeftRight } from 'lucide-react'
import { CollapsibleFormSection } from '../common/collapsible-form-section'
import { useState } from 'react'

type BuyMode = 'token' | 'BNB'

export const CreatorBuy: React.FC = () => {
  const [buyMode, setBuyMode] = useState<BuyMode>('token')

  function handleBuyModeClick() {
    if (buyMode === 'token') {
      setBuyMode('BNB')
    } else {
      setBuyMode('token')
    }
  }

  return (
    <CollapsibleFormSection title="创建者购买">
      <p className="mt-6 text-xs text-[#84888c]">
        创建者少量买入有助于减少抢跑，提高代币发行安全性。最多可购买 800M
        枚代币；超额支付将自动退回。部署成本：约 0.001 BNB
      </p>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="shrink-0 whitespace-nowrap text-xs font-normal text-foreground">
            购买数量
          </label>
          <span className="text-xs text-[#f7594b] min-w-0 whitespace-nowrap text-right">
            余额
            {':'}
            <span>BNB</span>
          </span>
        </div>
        <div className="flex items-center h-10.5 min-w-0 border border-[#84888c] bg-transparent focus-within:border-[#d0ff00]">
          <input
            inputMode="decimal"
            className="flex w-full border-input py-2 "
          />
          <button
            type="button"
            aria-label="切换购买单位"
            onClick={handleBuyModeClick}
            className="flex items-center justify-center gap-1.5 h-full w-fit min-w-25 shrink-0 border-l border-[#84888c] px-2 text-sm text-foreground transition-colors hover:text-[#d0ff00] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#d0ff00] disabled:cursor-not-allowed disabled:text-[#84888c]"
          >
            <ArrowLeftRight className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {buyMode === 'token' ? '代币' : buyMode}
            </span>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-[#84888c] font-normal">
          <div className="flex items-center gap-1">
            预计收到:
            <span className="text-foreground">800,000,000</span>
            <span className="text-foreground">代币</span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            最高:
            <span>16.3</span>
            <span>BNB</span>
          </div>
        </div>
      </div>
    </CollapsibleFormSection>
  )
}
