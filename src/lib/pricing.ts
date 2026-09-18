export function readStoredBaseline(tokenAddr: string): number | null {
  try {
    const raw = localStorage.getItem(
      `launchpad:baseline:${tokenAddr.toLowerCase()}`,
    )
    const num = Number(raw)
    return raw !== null && Number.isFinite(num) && num > 0 ? num : null
  } catch {
    return null
  }
}

export function storeBaseline(tokenAddr: string, price: number) {
  try {
    localStorage.setItem(
      `launchpad:baseline:${tokenAddr.toLowerCase()}`,
      String(price),
    )
  } catch {
    // Ignore when localStorage is unavailable.
  }
}