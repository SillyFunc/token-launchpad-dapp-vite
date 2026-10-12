export const HOME_PREFS_STORAGE_KEY = 'home-prefs'

export type BoardViewMode = 'list' | 'grid'

export interface HomePrefs {
  desktopViewMode?: BoardViewMode
}

function readHomePrefs(): HomePrefs {
  try {
    const raw = localStorage.getItem(HOME_PREFS_STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as HomePrefs)
      : {}
  } catch {
    return {}
  }
}

export function readBoardViewMode(): BoardViewMode {
  const mode = readHomePrefs().desktopViewMode
  return mode === 'grid' || mode === 'list' ? mode : 'list'
}

/**
 * Writes only the board view mode and keeps any other fields already stored
 * under `home-prefs`. Storage can be unavailable (private mode, quota), in
 * which case the in-memory state still works for the current session.
 */
export function writeBoardViewMode(mode: BoardViewMode): void {
  try {
    const next: HomePrefs = { ...readHomePrefs(), desktopViewMode: mode }
    localStorage.setItem(HOME_PREFS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort; ignore write failures.
  }
}
