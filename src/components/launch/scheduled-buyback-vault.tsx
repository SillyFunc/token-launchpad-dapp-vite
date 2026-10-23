import { LucideClock3 } from 'lucide-react'
import { CollapsibleFormSection } from '../common/collapsible-form-section'

import { Checkbox } from '../ui/checkbox'
import BuybackVaultLogo from '@/assets/svgs/scheduled-buyback-vault-logo.svg'
import {
  defaultFirstExecuteAt,
  type BuybackVaultDraft,
  type BuybackVaultIntervalUnit,
  type BuybackVaultTrigger,
} from '@/lib/buyback-vault'
import { sanitizeDecimal } from '@/lib/presale-input'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { Button } from '../ui/button'

const INTERVAL_UNITS: {
  value: BuybackVaultIntervalUnit
  label: () => string
}[] = [
  { value: 'minutes', label: () => m.buyback_vault_unit_minutes() },
  { value: 'hours', label: () => m.buyback_vault_unit_hours() },
  { value: 'days', label: () => m.buyback_vault_unit_days() },
]

export interface ScheduledBuybackVaultProps {
  value: BuybackVaultDraft
  onChange: (value: BuybackVaultDraft) => void
  isCreateMode?: boolean
  firstExecuteAtError?: string
}

const configInputClassName =
  'h-10 w-full min-w-0 max-w-full border border-foreground/15 bg-background/30 px-3 text-sm text-white outline-none focus:border-[#FE810B]'

function conditionIncludes(
  condition: BuybackVaultTrigger,
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

export const ScheduledBuybackVault: React.FC<ScheduledBuybackVaultProps> = ({
  value,
  onChange,
  isCreateMode = false,
  firstExecuteAtError,
}) => {
  const selected = value.selected
  const buybackMode = value.buybackMode
  const executionCondition = value.executionCondition
  const intervalUnit = value.intervalUnit

  const patch = (next: Partial<BuybackVaultDraft>) => {
    onChange({ ...value, ...next })
  }

  const showFirstExecutionTime = conditionIncludes(executionCondition, 'time')
  const showTriggerBalance = conditionIncludes(executionCondition, 'balance')

  return (
    <CollapsibleFormSection
      title={m.buyback_vault_section_title()}
      defaultOpen={selected}
    >
      <button
        type="button"
        aria-label={m.buyback_vault_select()}
        aria-pressed={selected}
        onClick={() => {
          const nextSelected = !selected
          patch(
            nextSelected && isCreateMode && !value.firstExecuteAt
              ? { selected: true, firstExecuteAt: defaultFirstExecuteAt() }
              : { selected: nextSelected },
          )
        }}
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
              {m.buyback_vault_name()}
            </span>
            <span className="min-w-0 truncate text-[0.625rem] text-[#84888c] block sm:line-clamp-2">
              {m.buyback_vault_description()}
            </span>
          </div>
          <Checkbox
            checked={selected}
            render={<span aria-hidden="true" />}
            tabIndex={-1}
            className="pointer-events-none size-4 data-checked:border-[#FE810B] data-checked:bg-[#FE810B] data-checked:text-black dark:data-checked:bg-[#FE810B]"
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
            <h4 className="mb-5 text-base font-medium">
              {m.buyback_vault_config_title()}
            </h4>
            <div className="min-w-0 space-y-5">
              <section>
                <h4 className="text-sm font-semibold">
                  {m.buyback_vault_mode_title()}
                </h4>
                <p className="text-xs font-normal text-muted-foreground mt-1 mb-2">
                  {m.buyback_vault_mode_description()}
                </p>
                <div className="grid sm:grid-cols-2 grid-cols-1 gap-3">
                  <button
                    type="button"
                    aria-label={m.buyback_vault_mode_token()}
                    aria-pressed={buybackMode === 'token'}
                    onClick={() => patch({ buybackMode: 'token' })}
                    className={optionClassName(buybackMode === 'token')}
                  >
                    <strong
                      className={optionTitleClassName(buybackMode === 'token')}
                    >
                      {m.buyback_vault_mode_token()}
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      {m.buyback_vault_mode_token_description()}
                    </small>
                  </button>
                  <button
                    type="button"
                    aria-label={m.buyback_vault_mode_lp()}
                    aria-pressed={buybackMode === 'lp'}
                    onClick={() => patch({ buybackMode: 'lp' })}
                    className={optionClassName(buybackMode === 'lp')}
                  >
                    <strong
                      className={optionTitleClassName(buybackMode === 'lp')}
                    >
                      {m.buyback_vault_mode_lp()}
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      {m.buyback_vault_mode_lp_description()}
                    </small>
                  </button>
                </div>
              </section>
              <section>
                <h4 className="text-sm font-semibold">
                  {m.buyback_vault_condition_title()}
                </h4>
                <p className="text-xs font-normal text-muted-foreground mt-1 mb-2">
                  {m.buyback_vault_condition_description()}
                </p>
                <div className="grid sm:grid-cols-2 grid-cols-1 gap-3">
                  <button
                    type="button"
                    aria-label={m.buyback_vault_condition_time()}
                    aria-pressed={executionCondition === 'time'}
                    onClick={() => patch({ executionCondition: 'time' })}
                    className={optionClassName(executionCondition === 'time')}
                  >
                    <strong
                      className={optionTitleClassName(
                        executionCondition === 'time',
                      )}
                    >
                      {m.buyback_vault_condition_time()}
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      {m.buyback_vault_condition_time_description()}
                    </small>
                  </button>
                  <button
                    type="button"
                    aria-label={m.buyback_vault_condition_balance()}
                    aria-pressed={executionCondition === 'balance'}
                    onClick={() => patch({ executionCondition: 'balance' })}
                    className={optionClassName(
                      executionCondition === 'balance',
                    )}
                  >
                    <strong
                      className={optionTitleClassName(
                        executionCondition === 'balance',
                      )}
                    >
                      {m.buyback_vault_condition_balance()}
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      {m.buyback_vault_condition_balance_description()}
                    </small>
                  </button>
                  <button
                    type="button"
                    aria-label={m.buyback_vault_condition_both()}
                    aria-pressed={executionCondition === 'time-and-balance'}
                    onClick={() =>
                      patch({ executionCondition: 'time-and-balance' })
                    }
                    className={optionClassName(
                      executionCondition === 'time-and-balance',
                    )}
                  >
                    <strong
                      className={optionTitleClassName(
                        executionCondition === 'time-and-balance',
                      )}
                    >
                      {m.buyback_vault_condition_both()}
                    </strong>
                    <small className="mt-1 text-muted-foreground text-xs">
                      {m.buyback_vault_condition_both_description()}
                    </small>
                  </button>
                </div>
              </section>
              <section className="flex flex-col gap-4 p-3 border bg-foreground/3">
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {m.buyback_vault_first_title()}
                  </h4>
                  <p className="font-normal text-muted-foreground text-xs">
                    {m.buyback_vault_first_description()}
                  </p>
                </div>
                {showFirstExecutionTime && (
                  <label className="block min-w-0">
                    <span className="mb-2 font-medium text-foreground/70 text-xs block">
                      {m.buyback_vault_first_time()}
                    </span>
                    <div className="relative min-w-0">
                      <LucideClock3 className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 size-4" />
                      <input
                        type="datetime-local"
                        step={60}
                        value={value.firstExecuteAt}
                        onChange={(event) =>
                          patch({ firstExecuteAt: event.target.value })
                        }
                        className={cn(
                          configInputClassName,
                          'block appearance-none overflow-hidden pl-10',
                        )}
                      />
                    </div>
                    <p className="mt-1 text-xs text-foreground/40">
                      {m.buyback_vault_first_time_hint()}
                    </p>
                    {firstExecuteAtError ? (
                      <p className="mt-1 text-xs text-[#f7594b]">
                        {firstExecuteAtError}
                      </p>
                    ) : null}
                  </label>
                )}
                {showTriggerBalance && (
                  <label className="block min-w-0">
                    <span className="mb-2 font-medium text-foreground/70 text-xs block">
                      {m.buyback_vault_trigger_amount()}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      className={configInputClassName}
                      value={value.triggerAmount}
                      onChange={(event) =>
                        patch({
                          triggerAmount: sanitizeDecimal(event.target.value, 3),
                        })
                      }
                    />
                  </label>
                )}
              </section>
              <section className="flex flex-col gap-4 p-3 border bg-foreground/3">
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {m.buyback_vault_execution_title()}
                  </h4>
                  <p className="font-normal text-muted-foreground text-xs">
                    {m.buyback_vault_execution_description()}
                  </p>
                </div>
                <label className="block min-w-0">
                  <span className="mb-2 font-medium text-foreground/70 text-xs block">
                    {m.buyback_vault_min_interval()}
                  </span>
                  <div className="grid min-w-0 grid-cols-1 gap-2">
                    <input
                      inputMode="numeric"
                      min="1"
                      max="525600"
                      step="1"
                      className={configInputClassName}
                      type="number"
                      value={value.interval}
                      onChange={(event) =>
                        patch({ interval: event.target.value })
                      }
                    />
                    <div className="flex h-8 items-stretch overflow-hidden border border-foreground/15 bg-background/30 w-full p-0.5">
                      {INTERVAL_UNITS.map((unit) => (
                        <button
                          key={unit.value}
                          type="button"
                          aria-pressed={intervalUnit === unit.value}
                          onClick={() => patch({ intervalUnit: unit.value })}
                          className={cn(
                            'cursor-pointer px-3 text-xs transition-colors flex-1',
                            intervalUnit === unit.value
                              ? 'bg-[#FE810B] text-foreground'
                              : 'text-foreground/60 hover:text-foreground',
                          )}
                        >
                          {unit.label()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-foreground/40">
                    {m.buyback_vault_integer_hint()}
                  </p>
                </label>
                <label className="block min-w-0">
                  <span className="mb-2 font-medium text-foreground/70 text-xs block">
                    {m.buyback_vault_amount_per_run()}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    className={configInputClassName}
                    value={value.buybackAmount}
                    onChange={(event) =>
                      patch({
                        buybackAmount: sanitizeDecimal(event.target.value, 3),
                      })
                    }
                  />
                  <p className="mt-1 text-xs text-foreground/40">
                    {m.buyback_vault_amount_per_run_hint()}
                  </p>
                </label>
              </section>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button
                type="button"
                onClick={() => patch({ selected: false })}
                className="text-sm px-4 bg-background border border-input text-foreground hover:bg-accent h-10"
              >
                {m.buyback_vault_cancel()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CollapsibleFormSection>
  )
}
