import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, Move, RotateCcw, XIcon } from 'lucide-react'
import { m } from '@/paraglide/messages.js'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'

export interface LogoCropDialogProps {
  open: boolean
  /** Cancel / dismiss without producing a file. */
  onClose: () => void
  /** Object URL of the locally picked image. */
  imageSrc: string | null
  /** Re-open the file picker to choose a different image. */
  onChooseOther: () => void
  /** Cropped square PNG, ready to upload. */
  onConfirm: (file: File) => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ARROW_NUDGE_PX = 2
const OUTPUT_SIZE_PX = 512
const OUTPUT_TYPE = 'image/png'

interface Point {
  x: number
  y: number
}

/**
 * Bottom-sheet crop dialog built with createPortal + motion. Drag (or arrow
 * keys) to position the image inside the square crop area, zoom with the
 * slider (1x–3x), then confirm to export a 512×512 PNG.
 */
export const LogoCropDialog: React.FC<LogoCropDialogProps> = ({
  open,
  onClose,
  imageSrc,
  onChooseOther,
  onConfirm,
}) => {
  const areaRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const dragState = useRef<{
    pointerId: number
    startClient: Point
    startOffset: Point
  } | null>(null)

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState<{
    w: number
    h: number
  } | null>(null)
  const [areaSize, setAreaSize] = useState(0)

  const clampOffset = useCallback(
    (point: Point, nextZoom: number, nextAreaSize: number): Point => {
      if (!naturalSize || nextAreaSize <= 0) return point
      const baseScale = nextAreaSize / Math.min(naturalSize.w, naturalSize.h)
      const renderedW = naturalSize.w * baseScale * nextZoom
      const renderedH = naturalSize.h * baseScale * nextZoom
      const maxX = Math.max(0, (renderedW - nextAreaSize) / 2)
      const maxY = Math.max(0, (renderedH - nextAreaSize) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, point.x)),
        y: Math.min(maxY, Math.max(-maxY, point.y)),
      }
    },
    [naturalSize],
  )

  // Measure the crop area so zoom math uses the real (responsive) size.
  useLayoutEffect(() => {
    if (!open) return
    const element = areaRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setAreaSize(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [open])

  // Reset position/zoom whenever a new image is loaded.
  useEffect(() => {
    if (!open || !imageSrc) return
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      setNaturalSize({ w: image.naturalWidth, h: image.naturalHeight })
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    image.src = imageSrc
    return () => {
      cancelled = true
    }
  }, [open, imageSrc])

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startOffset: offset,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const next = {
      x: drag.startOffset.x + (event.clientX - drag.startClient.x),
      y: drag.startOffset.y + (event.clientY - drag.startClient.y),
    }
    setOffset(clampOffset(next, zoom, areaSize))
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return
    dragState.current = null
  }

  const handleAreaKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = {
      ArrowUp: { x: 0, y: -ARROW_NUDGE_PX },
      ArrowDown: { x: 0, y: ARROW_NUDGE_PX },
      ArrowLeft: { x: -ARROW_NUDGE_PX, y: 0 },
      ArrowRight: { x: ARROW_NUDGE_PX, y: 0 },
    }[event.key]
    if (!delta) return
    event.preventDefault()
    setOffset((prev) =>
      clampOffset({ x: prev.x + delta.x, y: prev.y + delta.y }, zoom, areaSize),
    )
  }

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom)
    setOffset((prev) => clampOffset(prev, nextZoom, areaSize))
  }

  const handleReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleConfirm = async () => {
    if (!imageSrc || !naturalSize || areaSize <= 0) return
    const image = imageRef.current
    if (!image) return

    try {
      const baseScale = areaSize / Math.min(naturalSize.w, naturalSize.h)
      const scale = baseScale * zoom
      const renderedW = naturalSize.w * scale
      const renderedH = naturalSize.h * scale
      // Crop-window top-left in rendered-image coordinates.
      const cropLeft = (renderedW - areaSize) / 2 - offset.x
      const cropTop = (renderedH - areaSize) / 2 - offset.y
      const sourceSize = areaSize / scale

      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE_PX
      canvas.height = OUTPUT_SIZE_PX
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas 2D unavailable')
      context.drawImage(
        image,
        cropLeft / scale,
        cropTop / scale,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE_PX,
        OUTPUT_SIZE_PX,
      )

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, OUTPUT_TYPE),
      )
      if (!blob) throw new Error('Canvas export failed')
      onConfirm(new File([blob], 'logo.png', { type: OUTPUT_TYPE }))
      onClose()
    } catch {
      toast.error(m.request_failed(), m.launch_crop_failed())
    }
  }

  const baseScale =
    naturalSize && areaSize > 0
      ? areaSize / Math.min(naturalSize.w, naturalSize.h)
      : 1
  const renderedW = naturalSize ? naturalSize.w * baseScale * zoom : 0
  const renderedH = naturalSize ? naturalSize.h * baseScale * zoom : 0
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
            onClick={onClose}
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
            <div className="flex items-center justify-between gap-3 px-4 h-13 border-y border-[#484b51]">
              <h2 className="text-base font-semibold text-foreground">
                <span aria-hidden className="text-[#FE810B]">
                  {'//'}
                </span>
                {m.launch_crop_title()}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={m.common_close()}
                onClick={onClose}
                className="shrink-0"
              >
                <XIcon />
              </Button>
            </div>

            <div className="p-4 flex-1 flex flex-col min-h-0 gap-5">
              <p className="text-xs/relaxed text-muted-foreground">
                {m.launch_crop_description()}
              </p>

              <div className="flex flex-col gap-5 items-center">
                <div
                  ref={areaRef}
                  role="application"
                  tabIndex={0}
                  aria-label={m.launch_crop_area_label()}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onKeyDown={handleAreaKeyDown}
                  className="relative aspect-square size-80 max-w-full shrink-0 cursor-grab touch-none overflow-hidden border-[#303236] bg-background outline-none active:cursor-grabbing focus-visible:border-[#FE810B] focus-visible:ring-1 focus-visible:ring-[#FE810B]"
                >
                  {imageSrc && naturalSize && (
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute max-w-none select-none"
                      style={{
                        left: `calc(50% + ${offset.x}px)`,
                        top: `calc(50% + ${offset.y}px)`,
                        width: renderedW,
                        height: renderedH,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                  >
                    <span className="absolute inset-y-0 left-1/3 border-l border-[#303236]"></span>
                    <span className="absolute inset-y-0 left-2/3 border-l border-[#303236]"></span>
                    <span className="absolute inset-x-0 top-1/3 border-t border-[#303236]"></span>
                    <span className="absolute inset-x-0 top-2/3 border-t border-[#303236]"></span>
                    <span className="absolute left-2.5 top-2.5 h-4 w-4 border-l border-t border-[#FE810B]"></span>
                    <span className="absolute right-2.5 top-2.5 h-4 w-4 border-r border-t border-[#FE810B]"></span>
                    <span className="absolute bottom-2.5 left-2.5 h-4 w-4 border-b border-l border-[#FE810B]"></span>
                    <span className="absolute bottom-2.5 right-2.5 h-4 w-4 border-b border-r border-[#FE810B]"></span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 text-[#a0a3a7] text-sm">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5 shrink-0" />
                    {m.launch_crop_reset()}
                  </button>
                  <span
                    aria-hidden="true"
                    className="bg-[#484b51] h-3 w-px"
                  ></span>
                  <button
                    type="button"
                    onClick={onChooseOther}
                    className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <ImagePlus className="size-3.5 shrink-0" />
                    {m.launch_crop_choose_other()}
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full text-[#a0a3a7] text-xs">
                  <Move className="size-3.5 shrink-0" aria-hidden="true" />
                  {m.launch_crop_arrow_hint()}
                </div>

                <div className="flex w-full flex-col gap-4 pb-4">
                  <div className="flex items-center justify-between text-sm text-foreground">
                    <span className="font-normal">
                      {m.launch_crop_zoom_label()}
                    </span>
                    <span className="tabular-nums font-medium">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={m.launch_crop_zoom_label()}
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.1}
                    value={zoom}
                    onChange={(event) =>
                      handleZoomChange(Number(event.target.value))
                    }
                    className="crop-zoom-slider h-1 w-full cursor-pointer appearance-none bg-[#84888c]"
                  />
                </div>

                <div className="grid w-full grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="h-10.5 text-sm bg-background hover:bg-accent font-semibold text-foreground"
                  >
                    {m.launch_crop_cancel()}
                  </Button>
                  <Button
                    onClick={() => void handleConfirm()}
                    className="h-10.5 bg-[#FE810B] text-sm font-semibold hover:bg-[#FE810B]/85 text-foreground"
                  >
                    {m.launch_crop_confirm()}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
