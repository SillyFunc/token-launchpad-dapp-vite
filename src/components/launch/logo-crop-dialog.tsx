import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ImagePlus,
  LucideX,
  Move,
  RotateCcw,
  RotateCw,
  XIcon,
} from 'lucide-react'
import { m } from '@/paraglide/messages.js'
import { Button } from '@/components/ui/button'

export interface LogoCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Object URL (or remote URL in edit mode) of the logo to crop. */
  imageSrc: string | null
}

/**
 * Bottom-sheet crop dialog built with createPortal + motion (no ui/dialog).
 * For now it only previews the selected image; the actual crop controls will
 * live here later.
 */
export const LogoCropDialog: React.FC<LogoCropDialogProps> = ({
  open,
  onOpenChange,
  imageSrc,
}) => {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={m.launch_crop_title()}
            className="absolute inset-x-0 bottom-0 mx-auto flex w-full flex-col bg-[#070808] outline-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
          >
            <header className="flex items-center justify-between h-13 border-y border-[#484b51] px-4">
              <h2 className="text-base font-medium text-foreground">
                <span aria-hidden="true" className="text-[#FE810B]">
                  //
                </span>
                调整图片
              </h2>
              <button
                type="button"
                aria-label="关闭图片裁剪"
                className="group size-5 flex items-center justify-center border border-[#484b51] text-foreground hover:bg-transparent bg-transparent transition-colors hover:border-[#FE810B] hover:text-[#FE810B]! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0ff00] disabled:pointer-events-none disabled:opacity-40"
              >
                <LucideX className="size-3.5" />
              </button>
            </header>
            <div className="p-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
              <p className="w-full text-left text-xs font-normal text-[#a0a3a7]">
                拖動圖片調整位置，再縮放圖片以適配方形裁剪區域。
              </p>
              <div className="flex items-center justify-center gap-3 text-[#a0a3a7]">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm leading-5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-[#FE810B] disabled:pointer-events-none disabled:opacity-40"
                >
                  <RotateCcw className="size-4" />
                  重置
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm leading-5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-[#FE810B] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ImagePlus className="size-4" />
                  選擇其他圖片
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#a0a3a7]">
                <Move />
                <span>提示：使用方向鍵微調圖片位置。</span>
              </div>
              <div className="flex w-full flex-col gap-4 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs leading-5 text-foreground">
                    縮放比例
                  </span>
                  <span className="text-base tabular-nums leading-6 text-foreground">
                    1.0x
                  </span>
                </div>
              </div>
              <div className="w-full grid grid-cols-2 gap-3">
                <button className="h-10.5 min-w-0 flex items-center justify-center border border-[#84888c] bg-transparent text-sm font-semibold text-foreground transition-colors hover:border-[#d0ff00] hover:text-[#d0ff00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0ff00] disabled:pointer-events-none disabled:opacity-40">
                  取消
                </button>
                <button className="h-10.5 min-w-0 flex items-center justify-center border-none text-sm bg-[#FE810B] text-foreground font-semibold transition-colors hover:bg-[#FE810B]/85 focus-visible:outline-none">
                  使用此图片
                </button>
              </div>
            </div>
            {/* {imageSrc && (
              <div className="flex items-center justify-center">
                <img
                  src={imageSrc}
                  alt={m.launch_uploaded_logo_alt()}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
              </div>
            )} */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
