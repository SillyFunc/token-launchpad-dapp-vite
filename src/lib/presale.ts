export function getPresaleProgress(value: bigint, total: bigint): number {
  if (total <= 0n) return 0

  const percentage = Number((value * 10_000n) / total) / 100
  return Math.min(100, Math.max(0, percentage))
}
