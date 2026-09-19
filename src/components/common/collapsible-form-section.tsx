import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FormSectionTitle } from '@/components/common/form-section-title'

export interface CollapsibleFormSectionProps {
  title: string
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

/**
 * An optional form section that starts collapsed (unless `defaultOpen`) and
 * expands when its title is clicked. The collapsed marker icon flips to the
 * expanded marker icon while open.
 */
export const CollapsibleFormSection: React.FC<CollapsibleFormSectionProps> = ({
  title,
  defaultOpen = false,
  className,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div className={cn('group flex flex-col', className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex cursor-pointer items-center self-start text-left focus-visible:outline-none"
      >
        <FormSectionTitle title={title} optional open={isOpen} />
      </button>
      <div id={contentId} hidden={!isOpen}>
        {children}
      </div>
    </div>
  )
}
