import { useConnection } from 'wagmi'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useReservedAddressOptions,
  type ReservedAddressOption,
  type ReservedAddressStatus,
} from '@/hooks/use-reserved-addresses'
import { m } from '@/paraglide/messages.js'

const NO_RESERVED_ADDRESS = ''

function formatAddress(address: string) {
  return `${address.slice(0, 10)}…${address.slice(-8)}`
}

function getStatusLabel(status: ReservedAddressStatus, isCurrent: boolean) {
  if (isCurrent) return m.launch_reserved_address_current()
  if (status === 0) return m.prelaunch_status_unused()
  if (status === 1) return m.prelaunch_status_occupied()
  return m.prelaunch_status_used()
}

function isSameAddress(
  first: ReservedAddressOption | null | undefined,
  second: ReservedAddressOption | null | undefined,
) {
  if (!first || !second) return false

  return (
    first.salt.toLowerCase() === second.salt.toLowerCase() ||
    first.address.toLowerCase() === second.address.toLowerCase()
  )
}

interface ReservedAddressSelectProps {
  id?: string
  value: ReservedAddressOption | null
  currentValue?: ReservedAddressOption | null
  onChange: (value: ReservedAddressOption | null) => void
}

export function ReservedAddressSelect({
  id = 'reservedAddress',
  value,
  currentValue = null,
  onChange,
}: ReservedAddressSelectProps) {
  const { address } = useConnection()
  const { data: options, isPending, isError } = useReservedAddressOptions()
  const visibleOptions =
    currentValue && !options.some((option) => isSameAddress(option, currentValue))
      ? [currentValue, ...options]
      : options
  const hasAvailableAddress = visibleOptions.some(
    (option) =>
      option.coinStatus === 0 || isSameAddress(option, currentValue),
  )
  const disabled =
    !address ||
    isPending ||
    isError ||
    (visibleOptions.length === 0 && !value)

  let hint = m.launch_reserved_address_hint()
  if (!address) hint = m.launch_reserved_address_connect()
  else if (isPending) hint = m.launch_reserved_address_loading()
  else if (isError) hint = m.launch_reserved_address_load_failed()
  else if (visibleOptions.length === 0) hint = m.launch_reserved_address_empty()
  else if (!hasAvailableAddress) hint = m.launch_reserved_address_all_used()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-white">
        {m.launch_reserved_address()}
      </label>
      <Select<ReservedAddressOption | string>
        value={value}
        onValueChange={(nextValue) =>
          onChange(
            !nextValue || nextValue === NO_RESERVED_ADDRESS
              ? null
              : (nextValue as ReservedAddressOption),
          )
        }
        itemToStringLabel={(item) =>
          typeof item === 'string'
            ? m.launch_reserved_address_none()
            : formatAddress(item.address)
        }
        itemToStringValue={(item) =>
          typeof item === 'string' ? item : item.salt
        }
        isItemEqualToValue={(item, selected) => {
          if (typeof item === 'string' || typeof selected === 'string') {
            return item === selected
          }
          return item.salt === selected.salt
        }}
        disabled={disabled}
        modal={false}
      >
        <SelectTrigger
          id={id}
          className="box-border w-full appearance-none rounded-xs border-[#84888c] bg-transparent px-3 py-0 text-sm text-white data-[size=default]:h-10.5 data-placeholder:text-[#84888c] focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FE810B] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-transparent dark:hover:bg-transparent [&_svg]:text-[#84888c]"
        >
          <SelectValue placeholder={m.launch_reserved_address_none()}>
            {(selectedValue: ReservedAddressOption | string | null) =>
              !selectedValue || typeof selectedValue === 'string'
                ? m.launch_reserved_address_none()
                : formatAddress(selectedValue.address)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          alignItemWithTrigger={false}
          className="rounded-xs border border-[#484b51] bg-[#131516] text-white ring-0"
        >
          <SelectGroup>
            <SelectItem value={NO_RESERVED_ADDRESS}>
              {m.launch_reserved_address_none()}
            </SelectItem>
            {visibleOptions.map((option) => {
              const isCurrent = isSameAddress(option, currentValue)

              return (
                <SelectItem
                  key={`${option.address}-${option.salt}`}
                  value={option}
                  disabled={option.coinStatus !== 0 && !isCurrent}
                >
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate font-mono">
                      {formatAddress(option.address)}
                    </span>
                    <span className="shrink-0 text-[#84888c]">
                      {getStatusLabel(option.coinStatus, isCurrent)}
                    </span>
                  </span>
                </SelectItem>
              )
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="text-xs leading-relaxed text-[#84888c]">{hint}</p>
    </div>
  )
}
