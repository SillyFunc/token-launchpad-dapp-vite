import type { InputHTMLAttributes, ReactNode } from 'react'

export function UnitInput({
  unit,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  unit: string
}) {
  return (
    <div className="relative">
      <input
        {...props}
        className="box-border h-10.5 w-full appearance-none rounded-xs border border-[#84888c] bg-transparent pl-3 pr-14 text-sm text-white focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FE810B]"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#FE810B]">
        {unit}
      </span>
    </div>
  )
}

export function FieldWrap({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-center gap-0.5">
        <label className="text-sm text-white">{label}</label>
        {required && <span className="text-xs text-[#f7594b]">*</span>}
      </div>
      {children}
    </div>
  )
}
