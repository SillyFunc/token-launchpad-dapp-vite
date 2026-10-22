import { cn } from '@/lib/utils'

export interface CornerBracketProps {
  className?: string
}

/** The thin "[" used around the CA on the token page; mirror it with `-scale-x-100`. */
export const CornerBracket: React.FC<CornerBracketProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 4.5 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('h-3 shrink-0 text-[#A0A3A7]', className)}
    >
      <path d="M4.25 0.5H0.5V13.5H4.25" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
