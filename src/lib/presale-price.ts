export const WAD = 10n ** 18n

export function calculatePresaleTokenPrice(
  hardcapWei: bigint,
  maxPresaleTokensWei: bigint,
): bigint | undefined {
  if (hardcapWei <= 0n || maxPresaleTokensWei <= 0n) return undefined

  return (hardcapWei * WAD + maxPresaleTokensWei - 1n) / maxPresaleTokensWei
}
