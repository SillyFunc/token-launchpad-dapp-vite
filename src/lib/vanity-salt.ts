import {
  keccak256,
  hexToBytes,
  bytesToHex,
  getAddress,
  type Hex,
} from 'viem'
import { useCallback, useEffect, useRef, useState } from 'react'
import { addresses } from '@sillyfunc/launchpad-contracts'

import { getInitCodeHash, predictCloneAddress } from '@/lib/eip1167'
import { PLATFORM_CHAIN_ID } from '@/lib/web3'
import type {
  VanityWorkerError,
  VanityWorkerInput,
  VanityWorkerOutput,
} from '@/workers/vanity-salt.worker'

export const VANITY_SUFFIX = 0x8888

const deployment = addresses[PLATFORM_CHAIN_ID]

export interface PredictTokenAddressOptions {
  tokenFactory?: Hex
  flapImplementation?: Hex
}

export function predictTokenAddress(
  salt: Hex,
  options: PredictTokenAddressOptions = {},
): Hex {
  return predictCloneAddress({
    tokenFactory: options.tokenFactory ?? deployment.tokenFactory,
    flapImplementation:
      options.flapImplementation ?? deployment.flapTaxTokenImplementation,
    salt,
  })
}

export function isVanity8888(address: string): boolean {
  if (!address || address.length < 4) return false
  return address.toLowerCase().endsWith('8888')
}

export interface VanitySaltResult {
  salt: Hex
  predictedAddress: Hex
  attempts: number
  durationMs: number
}

export interface FindVanitySaltOptions extends PredictTokenAddressOptions {
  maxAttempts?: number
  signal?: AbortSignal
}

export function findVanitySaltSync(
  options: FindVanitySaltOptions = {},
): VanitySaltResult {
  const start = performance.now()
  const tokenFactory = options.tokenFactory ?? deployment.tokenFactory
  const flapImplementation =
    options.flapImplementation ?? deployment.flapTaxTokenImplementation
  const maxAttempts = options.maxAttempts ?? 1_000_000
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
      return {
        salt,
        predictedAddress,
        attempts,
        durationMs: performance.now() - start,
      }
    }
  }

  throw new Error(
    `Could not find a 8888-suffix salt within ${maxAttempts} attempts`,
  )
}

export async function findVanitySaltChunked(
  options: FindVanitySaltOptions = {},
): Promise<VanitySaltResult> {
  const start = performance.now()
  const tokenFactory = options.tokenFactory ?? deployment.tokenFactory
  const flapImplementation =
    options.flapImplementation ?? deployment.flapTaxTokenImplementation
  const maxAttempts = options.maxAttempts ?? 1_000_000
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
  const CHUNK_SIZE = 4000

  let attempts = 0
  while (attempts < maxAttempts) {
    if (options.signal?.aborted) {
      throw new Error('Vanity salt search cancelled')
    }

    const chunkEnd = Math.min(attempts + CHUNK_SIZE, maxAttempts)
    for (; attempts < chunkEnd; attempts++) {
      view.setUint32(28, counter++, false)
      const hash = hexToBytes(keccak256(buf))

      if (hash[30] === 0x88 && hash[31] === 0x88) {
        const salt = bytesToHex(buf.slice(21, 53))
        const predictedAddress = getAddress(bytesToHex(hash.slice(12)))
        return {
          salt,
          predictedAddress,
          attempts: attempts + 1,
          durationMs: performance.now() - start,
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  throw new Error(
    `Could not find a 8888-suffix salt within ${maxAttempts} attempts`,
  )
}

export async function findVanitySalt(
  options: FindVanitySaltOptions = {},
): Promise<VanitySaltResult> {
  const tokenFactory = options.tokenFactory ?? deployment.tokenFactory
  const flapImplementation =
    options.flapImplementation ?? deployment.flapTaxTokenImplementation
  const maxAttempts = options.maxAttempts ?? 1_000_000

  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(
        new URL('../workers/vanity-salt.worker.ts', import.meta.url),
        { type: 'module' },
      )

      return await new Promise<VanitySaltResult>((resolve, reject) => {
        const cleanup = () => {
          worker.terminate()
          options.signal?.removeEventListener('abort', handleAbort)
        }

        const handleAbort = () => {
          cleanup()
          reject(new Error('Vanity salt search cancelled'))
        }

        if (options.signal?.aborted) {
          handleAbort()
          return
        }

        options.signal?.addEventListener('abort', handleAbort)

        worker.onmessage = (
          event: MessageEvent<VanityWorkerOutput | VanityWorkerError>,
        ) => {
          cleanup()
          if ('error' in event.data) {
            reject(new Error(event.data.error))
          } else {
            resolve(event.data)
          }
        }

        worker.onerror = (err) => {
          cleanup()
          console.warn('Vanity worker failed, falling back to chunked search:', err)
          void findVanitySaltChunked(options).then(resolve, reject)
        }

        worker.postMessage({
          tokenFactory,
          flapImplementation,
          maxAttempts,
        } satisfies VanityWorkerInput)
      })
    } catch (error) {
      console.warn('Could not start vanity worker, falling back to chunked search:', error)
    }
  }

  return findVanitySaltChunked(options)
}

export function useVanitySalt(options: PredictTokenAddressOptions = {}) {
  const [salt, setSalt] = useState<Hex | null>(null)
  const [predictedAddress, setPredictedAddress] = useState<Hex | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startSearch = useCallback(() => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsSearching(true)
    setError(null)

    findVanitySalt({
      tokenFactory: options.tokenFactory,
      flapImplementation: options.flapImplementation,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return
        setSalt(result.salt)
        setPredictedAddress(result.predictedAddress)
        setAttempts(result.attempts)
        setDurationMs(result.durationMs)
        setIsSearching(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Vanity salt search failed')
        setIsSearching(false)
      })
  }, [options.tokenFactory, options.flapImplementation])

  const reset = useCallback(() => {
    abortControllerRef.current?.abort()
    setSalt(null)
    setPredictedAddress(null)
    setIsSearching(false)
    setAttempts(0)
    setDurationMs(0)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    salt,
    predictedAddress,
    isSearching,
    attempts,
    durationMs,
    error,
    regenerate: startSearch,
    reset,
  }
}
