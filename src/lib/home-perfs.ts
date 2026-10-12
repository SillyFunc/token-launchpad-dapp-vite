export const HOME_PERFS_STORAGE_KEY = 'home-perfs'

export type BoardViewMode = 'list' | 'grid'

export interface HomePerfs {
  boardPerfs?: {
    desktopViewMode?: BoardViewMode
  }
}

function readHomePerfs(): HomePerfs {
  try {
    const raw = localStorage.getItem(HOME_PERFS_STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as HomePerfs)
      : {}
  } catch {
    return {}
  }
}

export function readBoardViewMode(): BoardViewMode {
  const mode = readHomePerfs().boardPerfs?.desktopViewMode
  return mode === 'grid' || mode === 'list' ? mode : 'list'
}

/**
 * Writes only the board view mode and keeps any other fields already stored
 * under `home-perfs`. Storage can be unavailable (private mode, quota), in
 * which case the in-memory state still works for the current session.
 */
export function writeBoardViewMode(mode: BoardViewMode): void {
  try {
    const current = readHomePerfs()
    const next: HomePerfs = {
      ...current,
      boardPerfs: { ...current.boardPerfs, desktopViewMode: mode },
    }
    localStorage.setItem(HOME_PERFS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort; ignore write failures.
  }
}
