import { useNavigate } from 'react-router'
import BackArrow from '@/assets/svgs/back-arrow.svg'

export interface PageTitleProps {
  title: string
  description?: string
  onBack?: () => void
}
export const PageTitle: React.FC<PageTitleProps> = ({
  title,
  description,
  onBack,
}) => {
  const nav = useNavigate()

  function handleBack() {
    if (onBack) {
      onBack()
    } else {
      nav('/')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="返回"
        onClick={handleBack}
        className="flex size-6 shrink-0 items-center justify-center rounded-xs hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FE810B]"
      >
        <img
          src={BackArrow}
          alt=""
          aria-hidden="true"
          className="size-full object-cover"
        />
      </button>
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-white tracking-wide">
          {title}
        </span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  )
}
