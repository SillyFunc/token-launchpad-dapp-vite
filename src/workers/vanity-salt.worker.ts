import { keccak256, hexToBytes, bytesToHex, getAddress, type Hex } from 'viem'

import { getInitCodeHash } from '@/lib/eip1167'

export interface VanityWorkerInput {
  tokenFactory: Hex
  flapImplementation: Hex
  maxAttempts?: number
}

export interface VanityWorkerOutput {
  salt: Hex
  predictedAddress: Hex
  attempts: number
  durationMs: number
}

export interface VanityWorkerError {
  error: string
}

self.onmessage = (event: MessageEvent<VanityWorkerInput>) => {
  const { tokenFactory, flapImplementation, maxAttempts = 1_000_000 } =
    event.data

  try {
    const start = performance.now()
    const initCodeHash = getInitCodeHash(flapImplementation)

    const buf = new Uint8Array(85)
    buf[0] = 0xff
    buf.set(hexToBytes(tokenFactory), 1)
    buf.set(initCodeHash, 53)

    const seed = new Uint8Array(32)
    crypto.getRandomValues(seed)
    buf.set(seed, 21)

    const view = new DataView(buf.buffer, buf.byteOffset + 21, 32)
    let counter = view.getUint32(28, false)

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      view.setUint32(28, counter++, false)
      const hash = hexToBytes(keccak256(buf))

      if (hash[30] === 0x88 && hash[31] === 0x88) {
        const salt = bytesToHex(buf.slice(21, 53))
        const predictedAddress = getAddress(bytesToHex(hash.slice(12)))
        const durationMs = performance.now() - start

        self.postMessage({
          salt,
          predictedAddress,
          attempts,
          durationMs,
        } satisfies VanityWorkerOutput)
        return
      }
    }

    self.postMessage({
      error: `Could not find a 8888-suffix salt within ${maxAttempts} attempts`,
    } satisfies VanityWorkerError)
  } catch (err: unknown) {
    self.postMessage({
      error: err instanceof Error ? err.message : 'Vanity salt search failed',
    } satisfies VanityWorkerError)
  }
}
