import { useId } from 'react'
import SliderLabelIcon from '@/assets/svgs/tax-rate-pointer.svg'

export interface TaxSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  required?: boolean
  id?: string
}

export const Slider: React.FC<TaxSliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  required = false,
  id,
}) => {
  const generatedId = useId()
  const inputId = id ?? `tax-slider-${generatedId.replace(/:/g, '')}`
  const safeValue = Number.isFinite(value) ? value : min
  const range = max - min
  const progress =
    range > 0
      ? Math.min(100, Math.max(0, ((safeValue - min) / range) * 100))
      : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="flex min-w-0 items-center gap-1">
          <span className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-0 truncate text-sm font-medium text-foreground">
            {label}
          </span>
          <img
            aria-hidden
            loading="lazy"
            decoding="sync"
            className="size-5 shrink-0 text-transparent"
            src={SliderLabelIcon}
            alt=""
          />
          {/* {required && (
            <span aria-hidden="true" className="text-sm text-[#f7594b]">
              *
            </span>
          )} */}
        </label>
        <output
          htmlFor={inputId}
          className="flex h-8 w-12 items-center justify-center border border-white/30 bg-[#141517] text-sm font-bold text-[#FB5F16]"
        >
          {safeValue}%
        </output>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="relative flex items-center py-1">
          <div className="h-1 w-full bg-[#757575]" aria-hidden="true">
            <div
              className="h-1 bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            id={inputId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={safeValue}
            required={required}
            aria-label={label}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus:outline-none focus-visible:outline-none focus:ring-0"
          />
          <div
            className="pointer-events-none absolute size-3 -translate-x-1/2 bg-[#FB5F16]"
            style={{ left: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex justify-between text-[#84888c] text-xs">
          <span>{min}%</span>
          <span>{max}%</span>
        </div>
      </div>
    </div>
  )
}
