import { Avatar, Style } from '@dicebear/core'
import definition from '@dicebear/styles/fun-emoji.json' with { type: 'json' }

const style = new Style(definition)

/**
 * Deterministic avatar for a wallet address. The same address always yields the
 * same image, so users recognise their own avatar across visits. Returns null for
 * an empty address so callers can show a placeholder instead of a fake avatar.
 */
export function walletAvatarDataUri(address: string | undefined): string | null {
  if (!address) return null
  return new Avatar(style, { seed: address.toLowerCase() }).toDataUri()
}
