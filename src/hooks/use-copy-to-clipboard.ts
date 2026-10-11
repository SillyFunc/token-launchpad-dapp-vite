import { useEffect, useState } from 'react'

const COPIED_DURATION_MS = 1500

/**
 * Copies text through the async Clipboard API. `copiedText` holds the value
 * most recently copied and clears itself after a short delay, so list rows can
 * compare against their own value to show a check icon.
 */
export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  useEffect(() => {
    if (copiedText === null) return
    const timer = window.setTimeout(
      () => setCopiedText(null),
      COPIED_DURATION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [copiedText])

  const copy = async (text: string | null | undefined): Promise<boolean> => {
    if (!text || !navigator.clipboard) return false
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      return true
    } catch {
      setCopiedText(null)
      return false
    }
  }

  return { copy, copiedText }
}
