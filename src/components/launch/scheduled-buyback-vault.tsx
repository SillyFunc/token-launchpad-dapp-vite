import { useState } from 'react'
import { LucideClock3 } from 'lucide-react'
import { CollapsibleFormSection } from '../common/collapsible-form-section'

import { Checkbox } from '../ui/checkbox'
import BuybackVaultLogo from '@/assets/svgs/scheduled-buyback-vault-logo.svg'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'

type BuybackMode = 'token' | 'lp'
type ExecutionCondition = 'time' | 'balance' | 'time-and-balance'
type IntervalUnit = 'minutes' | 'hours' | 'days'

const INTERVAL_UNITS: { value: IntervalUnit; label: string }[] = [
  { value: 'minutes', label: '分钟' },
  { value: 'hours', label: '小时' },
  { value: 'days', label: '天' },
]

const configInputClassName =
  'h-10 w-full min-w-0 max-w-full border border-foreground/15 bg-background/30 px-3 text-sm text-white outline-none focus:border-[#FE810B]'

function conditionIncludes(
  condition: ExecutionCondition,
  kind: 'time' | 'balance',
) {
  return condition === kind || condition === 'time-and-balance'
}

function optionClassName(isSelected: boolean) {
  return cn(
    'flex cursor-pointer flex-col items-start justify-start border bg-foreground/3 p-3 text-left transition-colors',
    isSelected
      ? 'border-[#FE810B] bg-[#FE810B]/10'
      : 'hover:border-[#FE810B]/50',
  )
}

function optionTitleClassName(isSelected: boolean) {
  return cn(
    'block text-sm transition-colors',
    isSelected ? 'text-[#FE810B]' : 'text-foreground',
  )
}

export const ScheduledBuybackVault: React.FC = () => {
  const [selected, setSelected] = useState(false)
  const [buybackMode, setBuybackMode] = useState<BuybackMode>('token')
  const [executionCondition, setExecutionCondition] =
    useState<ExecutionCondition>('time')
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('minutes')

  const showFirstExecutionTime = conditionIncludes(executionCondition, 'time')
  const showTriggerBalance = conditionIncludes(executionCondition, 'balance')

  return (
    <CollapsibleFormSection title="選擇 VAULT">
      <button
        type="button"
        aria-label="選擇金庫"
        aria-pressed={selected}
        onClick={() => setSelected((prev) => !prev)}
        className="border border-[#484b51] bg-transparent p-4 gap-5 mt-6 w-full min-w-0 transition-colors"
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
          <Checkbox
            checked={selected}
            render={<span aria-hidden="true" />}
            tabIndex={-1}
            className="pointer-events-none size-4"
          />
        </div>
      </button>
      {selected && (
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
                    aria-pressed={buybackMode === 'token'}
                    onClick={() => setBuybackMode('token')}
                    className={optionClassName(buybackMode === 'token')}
                  >
                    <strong
                      className={optionTitleClassName(buybackMode === 'token')}
                    >
                      Token 回購銷燬
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      税收产生的BNB将保存在金库，根据执行条件中的设置执行自动回购税收代币，并将其永久销毁。
                    </small>
                  </button>
                  <button
                    type="button"
                    aria-label="LP 回購銷燬"
                    aria-pressed={buybackMode === 'lp'}
                    onClick={() => setBuybackMode('lp')}
                    className={optionClassName(buybackMode === 'lp')}
                  >
                    <strong
                      className={optionTitleClassName(buybackMode === 'lp')}
                    >
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
                    aria-label="時間"
                    aria-pressed={executionCondition === 'time'}
                    onClick={() => setExecutionCondition('time')}
                    className={optionClassName(executionCondition === 'time')}
                  >
                    <strong
                      className={optionTitleClassName(
                        executionCondition === 'time',
                      )}
                    >
                      時間
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      在所选开始时间首次执行，之后按设定间隔重复执行。
                    </small>
                  </button>
                  <button
                    type="button"
                    aria-label="金庫餘額"
                    aria-pressed={executionCondition === 'balance'}
                    onClick={() => setExecutionCondition('balance')}
                    className={optionClassName(
                      executionCondition === 'balance',
                    )}
                  >
                    <strong
                      className={optionTitleClassName(
                        executionCondition === 'balance',
                      )}
                    >
                      金庫餘額
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      当金库有足够 BNB 且已满足最短执行间隔时执行。
                    </small>
                  </button>
                  <button
                    type="button"
                    aria-label="时间 + 金库余额"
                    aria-pressed={executionCondition === 'time-and-balance'}
                    onClick={() => setExecutionCondition('time-and-balance')}
                    className={optionClassName(
                      executionCondition === 'time-and-balance',
                    )}
                  >
                    <strong
                      className={optionTitleClassName(
                        executionCondition === 'time-and-balance',
                      )}
                    >
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
                {showFirstExecutionTime && (
                  <label className="block min-w-0">
                    <span className="mb-2 font-medium text-foreground/70 text-xs block">
                      预计首次可执行时间（UTC+8）
                    </span>
                    <div className="relative min-w-0">
                      <LucideClock3 className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 size-4" />
                      <input
                        type="datetime-local"
                        step={60}
                        className={cn(
                          configInputClassName,
                          'block appearance-none overflow-hidden pl-10',
                        )}
                      />
                    </div>
                    <p className="mt-1 text-xs text-foreground/40">
                      固定使用 UTC+8，不跟随浏览器时区变化。
                    </p>
                  </label>
                )}
                {showTriggerBalance && (
                  <label className="block min-w-0">
                    <span className="mb-2 font-medium text-foreground/70 text-xs block">
                      触发金额（BNB）
                    </span>
                    <input
                      inputMode="decimal"
                      min="0.001"
                      max="10"
                      step="0.001"
                      className={configInputClassName}
                      type="number"
                      defaultValue="1"
                    />
                  </label>
                )}
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
                  <div className="grid min-w-0 grid-cols-1 gap-2">
                    <input
                      inputMode="numeric"
                      min="1"
                      max="525600"
                      step="1"
                      className={configInputClassName}
                      type="number"
                      defaultValue="1"
                    />
                    <div className="flex h-8 items-stretch overflow-hidden border border-foreground/15 bg-background/30 w-full p-0.5">
                      {INTERVAL_UNITS.map((unit) => (
                        <button
                          key={unit.value}
                          type="button"
                          aria-pressed={intervalUnit === unit.value}
                          onClick={() => setIntervalUnit(unit.value)}
                          className={cn(
                            'cursor-pointer px-3 text-xs transition-colors flex-1',
                            intervalUnit === unit.value
                              ? 'bg-[#FE810B] text-foreground'
                              : 'text-foreground/60 hover:text-foreground',
                          )}
                        >
                          {unit.label}
                        </button>
                      ))}
                    </div>
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
                    className={configInputClassName}
                    type="number"
                    defaultValue="0.001"
                  />
                  <p className="mt-1 text-xs text-foreground/40">
                    金库每次执行时使用的 BNB 数量。
                  </p>
                </label>
              </section>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button
                onClick={() => setSelected(false)}
                className="text-sm px-4 bg-background border border-input text-foreground hover:bg-accent h-10"
              >
                取消配置
              </Button>
              <Button className="bg-[#FE810B] text-foreground text-sm px-4 border-none outline-none hover:bg-[#FE810B]/85 h-10">
                配置复核
              </Button>
            </div>
          </div>
        </div>
      )}
    </CollapsibleFormSection>
  )
}
