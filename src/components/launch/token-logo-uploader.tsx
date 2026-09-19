import { Crop } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react'
import { m } from '@/paraglide/messages.js'
import { toast } from '@/lib/toast'
import { LogoCropDialog } from './logo-crop-dialog'

const MAX_LOGO_SIZE = 3 * 1024 * 1024

/** "cat.jpg" -> "cat" (a name with no extension is returned as-is). */
function stripExtension(name: string) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/**
 * Logos loaded from the backend are stored as full URLs, so edit mode would
 * otherwise print the whole URL. Show the last path segment instead, decoded
 * when it is percent-encoded.
 */
function fileNameFromUrl(url: string) {
  const path = url.split(/[?#]/, 1)[0]
  const segment = path.slice(path.lastIndexOf('/') + 1)
  if (!segment) return url

  try {
    return decodeURIComponent(segment)
  } catch {
    // Malformed escape sequence: fall back to the raw segment.
    return segment
  }
}

export interface TokenLogoUploaderProps {
  /** Existing remote logo URL (edit mode). */
  initialPreview?: string | null
  onFileChange?: (file: File | null) => void
}
export const TokenLogoUploader: React.FC<TokenLogoUploaderProps> = ({
  initialPreview = null,
  onFileChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  // Last locally picked (uncropped) image, kept so "adjust crop" can start over.
  const rawFileRef = useRef<File | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialPreview)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false)

  // Revoke the object URL only when the preview is replaced/unmounted, so the
  // <img> never renders a revoked blob URL.
  useEffect(
    () => () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  // Same for the crop dialog source, which is always an object URL we created.
  useEffect(
    () => () => {
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    },
    [cropSourceUrl],
  )

  const openCropDialogWith = (sourceFile: File) => {
    rawFileRef.current = sourceFile
    setCropSourceUrl(URL.createObjectURL(sourceFile))
    setIsCropDialogOpen(true)
  }

  const applyFile = (nextFile: File | null) => {
    if (!nextFile) return
    if (!nextFile.type.startsWith('image/')) {
      toast.error(m.request_failed(), m.launch_invalid_image())
      return
    }
    if (nextFile.size > MAX_LOGO_SIZE) {
      toast.error(m.request_failed(), m.launch_image_too_large())
      return
    }
    // A newly picked local image goes straight into the crop dialog; the
    // committed logo only changes once the crop is confirmed.
    openCropDialogWith(nextFile)
  }

  const handleCropConfirm = (croppedFile: File) => {
    // The dialog always exports PNG; keep the user's file name so the card
    // shows the real name instead of the dialog's placeholder.
    const originalName = rawFileRef.current?.name
    const namedFile = originalName
      ? new File([croppedFile], `${stripExtension(originalName)}.png`, {
          type: croppedFile.type,
        })
      : croppedFile
    setFile(namedFile)
    setPreview(URL.createObjectURL(namedFile))
    onFileChange?.(namedFile)
  }

  const handleCropClose = () => {
    setIsCropDialogOpen(false)
    // Keep the source URL alive through the exit animation; it is revoked on
    // unmount or when the next image is picked (effect cleanup above).
  }

  const handleAdjustCrop = () => {
    // Re-crop from the original picked image; fall back to the picker when the
    // logo came from the server (edit mode) and no local file exists.
    if (rawFileRef.current) {
      openCropDialogWith(rawFileRef.current)
      return
    }
    inputRef.current?.click()
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFile(event.target.files?.[0] ?? null)
    // Reset so picking the same file again re-triggers onChange.
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    applyFile(event.dataTransfer.files?.[0] ?? null)
  }

  const isUploaded = preview !== null

  return (
    <>
      <button
        type="button"
        aria-label={m.launch_upload_logo()}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="group relative flex w-full min-w-0 items-center gap-4 text-left outline-none transition-shadow focus-visible:ring-1 focus-visible:ring-[#FE810B]"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="flex min-w-0 items-center gap-4">
        {isUploaded ? (
          <img
            src={preview ?? ''}
            alt={m.launch_uploaded_logo_alt()}
            decoding="async"
            className="shrink-0 size-25 border border-[#484b51] object-cover color-transparent select-none"
            draggable={false}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="shrink-0 size-25 text-[#84888c] transition-colors group-hover:text-foreground"
          >
            <rect
              x="0.5"
              y="0.5"
              width="199"
              height="199"
              rx="3.5"
              stroke="currentColor"
            />
            <path d="M12 172L12 188L28 188" stroke="currentColor" />
            <path d="M172 188L188 188L188 172" stroke="currentColor" />
            <path d="M28 12L12 12L12 28" stroke="currentColor" />
            <path d="M188 28L188 12L172 12" stroke="currentColor" />
            <path
              d="M94.3333 130H76.6667C74.8986 130 73.2029 129.298 71.9526 128.047C70.7024 126.797 70 125.101 70 123.333V76.6667C70 74.8986 70.7024 73.2029 71.9526 71.9526C73.2029 70.7024 74.8986 70 76.6667 70H123.333C125.101 70 126.797 70.7024 128.047 71.9526C129.298 73.2029 130 74.8986 130 76.6667V110L119.667 99.6667C118.412 98.4373 116.723 97.7525 114.967 97.7613C113.211 97.77 111.529 98.4715 110.287 99.7133L80 130"
              stroke="#FE810B"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M106.668 125L116.668 115L126.668 125"
              stroke="#FE810B"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M116.668 133.333V115"
              stroke="#FE810B"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M89.9987 96.6668C93.6806 96.6668 96.6654 93.6821 96.6654 90.0002C96.6654 86.3183 93.6806 83.3335 89.9987 83.3335C86.3168 83.3335 83.332 86.3183 83.332 90.0002C83.332 93.6821 86.3168 96.6668 89.9987 96.6668Z"
              stroke="#FE810B"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <div className="min-w-0">
          {isUploaded ? (
            <>
              <span className="block truncate text-xs text-foreground/65">
                {file?.name ??
                  (initialPreview ? fileNameFromUrl(initialPreview) : '')}
              </span>
              <button
                type="button"
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation()
                  handleAdjustCrop()
                }}
                className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-[#FE810B]"
              >
                <Crop className="size-3.5 shrink-0" />
                {m.launch_adjust_crop()}
              </button>
            </>
          ) : (
            <>
              <span className="block wrap-break-word text-sm font-semibold uppercase text-[#FE810B]">
                // {m.launch_supported_formats()}
              </span>
              <span className="mt-2 block max-w-45 text-xs font-light text-foreground/65">
                {m.launch_logo_drop_hint()}
              </span>
              <span className="mt-4 block max-w-45 text-xs text-[#a0a3a7]">
                {m.launch_logo_formats()}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
      <LogoCropDialog
        open={isCropDialogOpen}
        onClose={handleCropClose}
        imageSrc={cropSourceUrl}
        onChooseOther={() => inputRef.current?.click()}
        onConfirm={handleCropConfirm}
      />
    </>
  )
}
