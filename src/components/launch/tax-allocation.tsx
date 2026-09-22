import { useState } from 'react'
import { Slider } from '../ui/slider'
import { FormSectionTitle } from '../common/form-section-title'

const CHANNEL_ORDER = ['creator', 'burn', 'dividend', 'liquidity'] as const

type ChannelKey = (typeof CHANNEL_ORDER)[number]

const CHANNEL_COLORS: Record<ChannelKey, string> = {
  creator: 'rgb(254, 129, 11)',
  burn: 'rgb(91, 49, 255)',
  dividend: 'rgb(247, 89, 75)',
  liquidity: 'rgb(22, 217, 217)',
}

/** Ring color of the not-yet-allocated arc (the legend uses its own gray dot). */
const UNALLOCATED_ARC_COLOR = 'rgb(31, 32, 35)'

/** Design default: the creator wallet takes 10%, the rest is unallocated. */
const INITIAL_ALLOCATION: Record<ChannelKey, number> = {
  creator: 10,
  burn: 0,
  dividend: 0,
  liquidity: 0,
}

export interface TaxAllocationProps {}
export const TaxAllocation: React.FC<TaxAllocationProps> = () => {
  const [allocation, setAllocation] = useState(INITIAL_ALLOCATION)
  const [minDividendBalance, setMinDividendBalance] = useState('0')

  const total = CHANNEL_ORDER.reduce((sum, key) => sum + allocation[key], 0)
  const unallocated = 100 - total

  /**
   * A channel can only grow by the headroom the other three leave, so the four
   * values can never add up to more than 100%.
   */
  const setChannel = (key: ChannelKey, next: number | readonly number[]) => {
    const raw = Array.isArray(next) ? next[0] : next
    setAllocation((prev) => {
      const headroom =
        100 - CHANNEL_ORDER.reduce((sum, k) => sum + prev[k], 0) + prev[key]
      const clamped = Math.min(Math.max(Math.round(raw), 0), headroom)
      return prev[key] === clamped ? prev : { ...prev, [key]: clamped }
    })
  }

  /** Ring segments follow the channel order; the tail is the unallocated arc. */
  const donutBackground = (() => {
    const stops: string[] = []
    let allocated = 0
    for (const key of CHANNEL_ORDER) {
      const value = allocation[key]
      if (value <= 0) continue
      stops.push(`${CHANNEL_COLORS[key]} ${allocated}% ${allocated + value}%`)
      allocated += value
    }
    if (allocated < 100) {
      stops.push(`${UNALLOCATED_ARC_COLOR} ${allocated}% 100%`)
    }
    return `conic-gradient(${stops.join(', ')})`
  })()

  const handleReset = () => setAllocation(INITIAL_ALLOCATION)

  return (
    <div className="flex flex-col gap-6">
      <FormSectionTitle title="税收分配" required></FormSectionTitle>
      <div className='class="mt-9 min-w-0 border border-[#84888c] bg-transparent p-4 text-xs"'>
        <div className="flex items-center gap-2 bg-[rgba(247,89,75,0.1)] p-3 text-[#f7594b]">
          <svg
            viewBox="0 0 13.1997 11.8672"
            className="size-3"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6.59999 8.40039C7.02319 8.40055 7.36613 8.74346 7.36627 9.16667C7.36627 9.58999 7.02328 9.93344 6.59999 9.93359C6.17657 9.93359 5.83306 9.59009 5.83306 9.16667C5.83321 8.74337 6.17666 8.40039 6.59999 8.40039Z"
              fill="currentColor"
            ></path>
            <path
              d="M7.20025 7.66732H5.99973V4.4668H7.20025V7.66732Z"
              fill="currentColor"
            ></path>
            <path
              d="M6.59999 0C6.8166 0.000103972 7.01654 0.117218 7.12278 0.30599L13.1228 10.9727C13.2272 11.1584 13.2251 11.3857 13.1176 11.5697C13.01 11.7536 12.8131 11.8671 12.6 11.8672H0.599992C0.386869 11.8672 0.189387 11.7536 0.0817624 11.5697C-0.0256982 11.3857 -0.027247 11.1584 0.0772051 10.9727L6.07721 0.30599L6.12082 0.238932C6.23324 0.0899005 6.41026 7.98932e-07 6.59999 0ZM1.62603 10.6667H11.574L6.59999 1.82357L1.62603 10.6667Z"
              fill="currentColor"
            ></path>
          </svg>
          <span className="text-xs">總分配必須為 100%</span>
        </div>
        <div className="mt-8 grid min-w-0 gap-5">
          <div className="flex min-w-0 flex-col items-center gap-3 overflow-hidden">
            <div
              className="relative flex size-32 shrink-0 items-center justify-center rounded-full"
              style={{ background: donutBackground }}
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-[#131516] text-sm font-medium text-foreground">
                {total}%
              </div>
            </div>
            <div className="flex w-full max-w-55 sm:max-w-full min-w-0 flex-col gap-1 text-xs font-light text-foreground">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: '#fe810b' }}
                  ></span>
                  <span className="min-w-0 truncate" title="创作者资金钱包">
                    创作者资金钱包
                  </span>
                </span>
                <span className="shrink-0 text-white">{allocation.creator}%</span>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: 'rgb(91, 49, 255)' }}
                  ></span>
                  <span className="min-w-0 truncate" title="銷毀">
                    銷毀
                  </span>
                </span>
                <span className="shrink-0 text-white">{allocation.burn}%</span>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: 'rgb(247, 89, 75)' }}
                  ></span>
                  <span className="min-w-0 truncate" title="分紅">
                    分紅
                  </span>
                </span>
                <span className="shrink-0 text-white">{allocation.dividend}%</span>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: 'rgb(22, 217, 217)' }}
                  ></span>
                  <span className="min-w-0 truncate" title="流動性">
                    流動性
                  </span>
                </span>
                <span className="shrink-0 text-white">{allocation.liquidity}%</span>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: 'rgb(128, 128, 128)' }}
                  ></span>
                  <span className="min-w-0 truncate" title="未分配">
                    未分配
                  </span>
                </span>
                <span className="shrink-0 text-[#f7594b]">{unallocated}%</span>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1 border border-[#a0a3a7] bg-[#1f2023] px-3 py-2.5 text-xs font-normal text-foreground">
                <span className="whitespace-nowrap">
                  <span className="text-[#a0a3a7]">總計:</span> {total}%
                </span>
                <span className="whitespace-nowrap">
                  <span className="text-[#a0a3a7]">未分配:</span>{' '}
                  <span className="text-[#f7594b]">{unallocated}%</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="shrink-0 border border-[#a0a3a7] px-3 py-2.5 font-jetbrains text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:border-[#fe810b] [@media(hover:hover)]:hover:text-[#fe810b]"
              >
                重置
              </button>
            </div>
            <div className="mt-5.5 min-w-0 space-y-5">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-0 truncate text-sm font-normal text-foreground">
                      创作者资金钱包
                    </label>
                    <span className="min-w-0 truncate text-xs font-light text-[#84888c]">
                      开发者、营销等
                    </span>
                  </div>
                  <input
                    inputMode="numeric"
                    readOnly
                    aria-readonly
                    className="w-13.5 shrink-0 border border-[#484b51] bg-transparent py-1 text-center text-sm leading-normal text-foreground focus-visible:border-[#fe810b] focus-visible:outline-none"
                    type="text"
                    value={`${allocation.creator}%`}
                  ></input>
                </div>
                <Slider
                  value={[allocation.creator]}
                  onValueChange={(next) => setChannel('creator', next)}
                  max={100}
                  step={1}
                  className="mx-auto w-full"
                />
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-0 truncate text-sm font-normal text-foreground">
                      銷毀
                    </label>
                    <span className="min-w-0 truncate text-xs font-light text-[#84888c]">
                      銷毀
                    </span>
                  </div>
                  <input
                    inputMode="numeric"
                    readOnly
                    aria-readonly
                    className="w-13.5 shrink-0 border border-[#484b51] bg-transparent py-1 text-center text-sm leading-normal text-foreground focus-visible:border-[#fe810b] focus-visible:outline-none"
                    type="text"
                    value={`${allocation.burn}%`}
                  ></input>
                </div>
                <Slider
                  value={[allocation.burn]}
                  onValueChange={(next) => setChannel('burn', next)}
                  max={100}
                  step={1}
                  className="mx-auto w-full"
                />
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-0 truncate text-sm font-normal text-foreground">
                      分紅
                    </label>
                    <span className="min-w-0 truncate text-xs font-light text-[#84888c]">
                      持有者獎勵
                    </span>
                  </div>
                  <input
                    inputMode="numeric"
                    readOnly
                    aria-readonly
                    className="w-13.5 shrink-0 border border-[#484b51] bg-transparent py-1 text-center text-sm leading-normal text-foreground focus-visible:border-[#fe810b] focus-visible:outline-none"
                    type="text"
                    value={`${allocation.dividend}%`}
                  ></input>
                </div>
                <Slider
                  value={[allocation.dividend]}
                  onValueChange={(next) => setChannel('dividend', next)}
                  max={100}
                  step={1}
                  className="mx-auto w-full"
                />
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-0 truncate text-sm font-normal text-foreground">
                      流動性
                    </label>
                    <span className="min-w-0 truncate text-xs font-light text-[#84888c]">
                      增加流動性
                    </span>
                  </div>
                  <input
                    inputMode="numeric"
                    readOnly
                    aria-readonly
                    className="w-13.5 shrink-0 border border-[#484b51] bg-transparent py-1 text-center text-sm leading-normal text-foreground focus-visible:border-[#fe810b] focus-visible:outline-none"
                    type="text"
                    value={`${allocation.liquidity}%`}
                  ></input>
                </div>
                <Slider
                  value={[allocation.liquidity]}
                  onValueChange={(next) => setChannel('liquidity', next)}
                  max={100}
                  step={1}
                  className="mx-auto w-full"
                />
              </div>
            </div>
          </div>
          <div className="mt-7.5 border-t border-[#484b51] pt-7.5">
            <div>
              <label
                className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block font-jetbrains text-[13px] font-normal leading-[normal] text-white"
                htmlFor="minDividendBalance"
              >
                分紅資格最低持倉
                <span className="text-[#84888c]"> （代幣）</span>
              </label>
              <input
                className="flex w-full py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2 h-[42px] rounded-[2px] border border-[#84888c] bg-transparent px-3 font-jetbrains text-white placeholder:text-[#84888c] focus-visible:border-[#d0ff00] focus-visible:ring-1 focus-visible:ring-[#d0ff00] text-[14px]"
                id="minDividendBalance"
                min="0"
                placeholder="0"
                type="number"
                value={minDividendBalance}
                onChange={(event) =>
                  setMinDividendBalance(event.target.value.replace(/\D/g, ''))
                }
              ></input>
              <p className="mt-2 font-jetbrains text-[11px] leading-[normal] text-[#a0a3a7]">
                最少：0 個代幣
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
