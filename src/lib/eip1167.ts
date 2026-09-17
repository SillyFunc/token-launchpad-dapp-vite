import {
  keccak256,
  hexToBytes,
  bytesToHex,
  getAddress,
  type Hex,
} from 'viem'

/**
 * EIP-1167 minimal proxy init code. Must match the OpenZeppelin Clones
 * template used by TokenFactory, otherwise CREATE2 predictions drift.
 *
 * 55 bytes = PREFIX(20) ‖ implementation(20) ‖ SUFFIX(15)
 */
export const EIP1167_PREFIX = hexToBytes(
  '0x3d602d80600a3d3981f3363d3d373d3d3d363d73',
)
export const EIP1167_SUFFIX = hexToBytes('0x5af43d82803e903d91602b57fd5bf3')

export function buildCloneInitCode(flapImplementation: Hex): Uint8Array {
  const initCode = new Uint8Array(55)
  initCode.set(EIP1167_PREFIX, 0)
  initCode.set(hexToBytes(flapImplementation), 20)
  initCode.set(EIP1167_SUFFIX, 40)
  return initCode
}

const initCodeHashCache = new Map<string, Uint8Array>()

export function getInitCodeHash(flapImplementation: Hex): Uint8Array {
  const key = flapImplementation.toLowerCase()
  const cached = initCodeHashCache.get(key)
  if (cached) return cached

  const hash = hexToBytes(keccak256(buildCloneInitCode(flapImplementation)))
  initCodeHashCache.set(key, hash)
  return hash
}

export interface PredictCloneAddressParams {
  tokenFactory: Hex
  flapImplementation: Hex
  salt: Hex
}

export function predictCloneAddress({
  tokenFactory,
  flapImplementation,
  salt,
}: PredictCloneAddressParams): Hex {
  const initCodeHash = getInitCodeHash(flapImplementation)

  const buf = new Uint8Array(85)
  buf[0] = 0xff
  buf.set(hexToBytes(tokenFactory), 1)
  buf.set(hexToBytes(salt), 21)
  buf.set(initCodeHash, 53)

  const hash = hexToBytes(keccak256(buf))
  return getAddress(bytesToHex(hash.slice(12)))
}
