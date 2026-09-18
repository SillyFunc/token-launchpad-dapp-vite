import { useCallback, useEffect, useRef, useState } from 'react'
import type { Hex } from 'viem'

import {
  findVanitySalt,
  type PredictTokenAddressOptions,
} from '@/lib/vanity-salt'

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
