import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(addr?: string | null): string {
  if (!addr) return '--'
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function getPresaleProgress(value: bigint, total: bigint): number {
  if (total <= 0n) return 0

  const percentage = Number((value * 10_000n) / total) / 100
  return Math.min(100, Math.max(0, percentage))
}
