import { LucideClock3 } from 'lucide-react'
import { CollapsibleFormSection } from '../common/collapsible-form-section'

import { Checkbox } from '../ui/checkbox'
import BuybackVaultLogo from '@/assets/svgs/scheduled-buyback-vault-logo.svg'

export const ScheduledBuybackVault: React.FC = () => {
  return (
    <CollapsibleFormSection title="選擇 VAULT">
      <button
        type="button"
        aria-label="選擇金庫"
        className="border border-[#484b51] bg-transparent p-4 gap-5 hover:border-[#FE810B] mt-6 w-full min-w-0"
      >
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <img
            loading="eager"
            src={BuybackVaultLogo}
            className="size-11 shrink-0 border border-[#484b51] bg-[#070808] object-cover"
            alt="ScheduledBuybackVaultV3"
          />
          <div className="flex flex-col gap-0.5 text-left min-w-0 flex-1">
            <span className="font-medium text-foreground text-sm">
              自動回購金庫
            </span>
            <span className="min-w-0 truncate text-[0.625rem] text-[#84888c] block sm:line-clamp-2">
              自动回购金库会按照预设规则，使用交易税收 BNB 自动回购并销毁 Token
              或 LP Token。
            </span>
          </div>
          <Checkbox checked className="size-4" />
        </div>
      </button>
      <div className="mt-4">
        <div
          className="h-2.5 w-full border border-[#FFA546] bg-[#070808]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #FE810B 0px, #FE810B 4px, transparent 4px, transparent 15px)',
          }}
        ></div>
        <div className="border-x border-b border-[#84888c] bg-transparent px-3 py-6">
          <h4 className="mb-5 text-base font-medium">配置自動回購金庫</h4>
          <div className="min-w-0 space-y-5">
            <section>
              <h4 className="text-sm font-semibold">回購方式</h4>
              <p className="text-xs font-normal text-muted-foreground mt-1 mb-2">
                选择金库将回购并销毁的资产。
              </p>
              <div className="grid sm:grid-cols-2 grid-cols-1 gap-3">
                <button
                  type="button"
                  aria-label="Token 回購銷燬"
                  className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                >
                  <strong className="block text-sm text-foreground">
                    Token 回購銷燬
                  </strong>
                  <small className="mt-1 text-muted-foreground text-xs">
                    税收产生的BNB将保存在金库，根据执行条件中的设置执行自动回购税收代币，并将其永久销毁。
                  </small>
                </button>
                <button
                  type="button"
                  aria-label="LP 回購銷燬"
                  className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                >
                  <strong className="block text-sm text-foreground">
                    LP 回购销毁
                  </strong>
                  <small className="mt-1 text-muted-foreground text-xs">
                    税收产生的BNB将保存在金库，根据执行条件中的设置执行自动回购税收代币并组建LP，LP将永久销毁。如果暂时无法执行LP回购，金库将回退为Token回购销毁。
                  </small>
                </button>
              </div>
            </section>
            <section>
              <h4 className="text-sm font-semibold">執行條件</h4>
              <p className="text-xs font-normal text-muted-foreground mt-1 mb-2">
                选择金库执行回购前必须满足的条件。
              </p>
              <div className="grid sm:grid-cols-2 grid-cols-1 gap-3">
                <button
                  type="button"
                  aria-label="Token 回購銷燬"
                  className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                >
                  <strong className="block text-sm text-foreground">
                    時間
                  </strong>
                  <small className="mt-1 text-muted-foreground text-xs">
                    在所选开始时间首次执行，之后按设定间隔重复执行。
                  </small>
                </button>
                <button
                  type="button"
                  aria-label="LP 回購銷燬"
                  className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                >
                  <strong className="block text-sm text-foreground">
                    金庫餘額
                  </strong>
                  <small className="mt-1 text-muted-foreground text-xs">
                    当金库有足够 BNB 且已满足最短执行间隔时执行。
                  </small>
                </button>
                <button
                  type="button"
                  aria-label="LP 回購銷燬"
                  className="flex flex-col items-start justify-start text-left p-3 border bg-foreground/3 focus:border-[#FE810B] focus:bg-[#FE810B]/10"
                >
                  <strong className="block text-sm text-foreground">
                    时间 + 金库余额
                  </strong>
                  <small className="mt-1 text-muted-foreground text-xs">
                    仅在所选时间和所需金库余额两个条件都满足后执行。
                  </small>
                </button>
              </div>
            </section>
            <section className="flex flex-col gap-4 p-3 border bg-foreground/3">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-foreground">
                  首次执行条件
                </h4>
                <p className="font-normal text-muted-foreground text-xs">
                  设置首次执行时间和/或金库开始执行回购前所需的余额。
                </p>
              </div>
              <label className="block min-w-0">
                <span className="mb-2 font-medium text-foreground/70 text-xs block">
                  预计首次可执行时间（UTC+8）
                </span>
                <div className="relative min-w-0">
                  <LucideClock3 className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 size-4" />
                  <input
                    type="datetime-local"
                    step={60}
                    className="block h-10 w-full min-w-0 max-w-full appearance-none overflow-hidden border border-foreground/15 bg-background/30 pl-10 pr-3 text-sm text-foreground outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-foreground/40">
                  固定使用 UTC+8，不跟随浏览器时区变化。
                </p>
              </label>
            </section>
            <section className="flex flex-col gap-4 p-3 border bg-foreground/3">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-foreground">
                  执行设置
                </h4>
                <p className="font-normal text-muted-foreground text-xs">
                  设置两次执行之间的最短间隔，以及每次执行使用的 BNB 数量。
                </p>
              </div>
              <label className="block min-w-0">
                <span className="mb-2 font-medium text-foreground/70 text-xs block">
                  最短执行间隔
                </span>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 max-sm:grid-cols-1">
                  <input
                    inputMode="numeric"
                    min="1"
                    max="525600"
                    step="1"
                    className="h-10 w-full min-w-0 max-w-full border border-foreground/15 bg-background/30 px-3 text-sm text-white outline-none focus:border-[#D0FF00]"
                    type="number"
                    value="1"
                  />
                </div>
                <p className="mt-1 text-xs text-foreground/40">请输入整数</p>
              </label>
              <label className="block min-w-0">
                <span className="mb-2 font-medium text-foreground/70 text-xs block">
                  每次执行使用的 BNB
                </span>
                <input
                  inputMode="decimal"
                  min="0.001"
                  max="10"
                  step="0.001"
                  className="h-10 w-full min-w-0 max-w-full border border-foreground/15 bg-background/30 px-3 text-sm text-white outline-none focus:border-[#D0FF00]"
                  type="number"
                  value="0.001"
                />
                <p className="mt-1 text-xs text-foreground/40">
                  金库每次执行时使用的 BNB 数量。
                </p>
              </label>
            </section>
          </div>
        </div>
      </div>
    </CollapsibleFormSection>
  )
}
