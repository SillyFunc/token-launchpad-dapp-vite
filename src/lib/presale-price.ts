export const WAD = 10n ** 18n

/**
 * BNB (wei) for `tokenAmount` (token wei) at `pricePerToken` (BNB wei per
 * whole token). Rounded up, like the per-wallet limit on the token page.
 */
export function tokenAmountToBnb(
  tokenAmount: bigint,
  pricePerToken: bigint,
): bigint {
  return (tokenAmount * pricePerToken + WAD - 1n) / WAD
}

export function calculatePresaleTokenPrice(
  hardcapWei: bigint,
  maxPresaleTokensWei: bigint,
): bigint | undefined {
  if (hardcapWei <= 0n || maxPresaleTokensWei <= 0n) return undefined

  return (hardcapWei * WAD + maxPresaleTokensWei - 1n) / maxPresaleTokensWei
}
