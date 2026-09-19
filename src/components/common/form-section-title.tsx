import ExpandSectionIcon from '@/assets/svgs/form-section-title.svg'
import CollapsibleSectionIcon from '@/assets/svgs/collapsible-section-marker.svg'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormSectionTitleBaseProps {
  title: string
}

interface RequiredSectionTitleProps extends FormSectionTitleBaseProps {
  required: true
  optional?: never
  open?: never
}

interface OptionalSectionTitleProps extends FormSectionTitleBaseProps {
  optional: true
  required?: never
  /** Expanded state, used by the parent collapse toggle to switch the marker icon. */
  open?: boolean
}

interface PlainSectionTitleProps extends FormSectionTitleBaseProps {
  required?: false
  optional?: false
  open?: never
}

export type FormSectionTitleProps =
  | RequiredSectionTitleProps
  | OptionalSectionTitleProps
  | PlainSectionTitleProps

export function FormSectionTitle(props: FormSectionTitleProps) {
  const { title } = props
  const required = props.required ?? false
  const optional = props.optional ?? false
  const open = optional ? (props.open ?? false) : false

  return (
    <div className="flex items-center gap-2 relative">
      <img
        alt=""
        src={
          optional && !open ? CollapsibleSectionIcon : ExpandSectionIcon
        }
        aria-hidden="true"
        className="size-4 absolute -left-6 align-middle"
      />
      <div className="inline-flex min-w-0 items-center gap-1 ml-1.5">
        <span className="text-base font-medium text-foreground flex items-center">
          {title}
          {optional && <span className="text-[#a0a3a7]">（可选）</span>}
          {required && <span className="text-[#f7594b] ml-1">&#42;</span>}
        </span>
        {optional && (
          <ChevronDown
            className={cn(
              'size-5 text-foreground transition-transform duration-200 group-focus-visible:text-[#d0ff00]',
              open && 'rotate-180',
            )}
          />
        )}
      </div>
    </div>
  )
}
