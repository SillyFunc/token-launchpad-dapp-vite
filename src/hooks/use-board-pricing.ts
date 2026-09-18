import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import {
  formatUnits,
  isAddress,
  parseAbi,
  zeroAddress,
  type Address,
  type ContractFunctionParameters,
} from 'viem'
import {
  flapTaxTokenV3Abi,
  presaleAbi,
} from '@sillyfunc/launchpad-contracts'

import type { BoardItemResponse } from '@/api/board'
import { useDexQuotes } from '@/hooks/use-dex-quotes'
import { getCoordinatorFactory } from '@/lib/contracts'
import { PLATFORM_CHAIN_ID, WRAPPED_NATIVE_ADDRESS } from '@/lib/web3'

// This is the external PancakeSwap V2 pair interface. Launchpad ABIs come from
// @sillyfunc/launchpad-contracts.
const pairAbi = parseAbi([
  'function token0() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
])

export type BoardStage =
  | 'live'
  | 'presale'
  | 'awaiting_launch'
  | 'failed'
  | 'not_launched'

export interface BoardTokenPricing {
  totalSupply: bigint | undefined
  stage: BoardStage
  priceBNB: number | null
  bnbReserve: bigint | null
  /** Real 24h change from the DEX aggregator; null when no market data. */
  changePercent: number | null
  volume24h: number | null
  liquidityUsd: number | null
}

type LaunchStatus = readonly [boolean, bigint, bigint, bigint, boolean, boolean]

interface MulticallSlot {
  result: unknown
  status: 'success' | 'failure'
}

function slot(data: unknown, index: number): MulticallSlot | undefined {
  if (!Array.isArray(data) || index >= data.length) return undefined
  return data[index] as MulticallSlot
}

export function useBoardPricing(
  tokens: BoardItemResponse[],
): Record<string, BoardTokenPricing> {
  const coordinator = useMemo(() => getCoordinatorFactory(), [])
  const entries = useMemo(() => {
    const list: { key: string; address: Address }[] = []
    for (const t of tokens) {
      const addr = t.coinContractAddress || ''
      if (!addr || !isAddress(String(addr))) continue
      const address = String(addr) as Address
      list.push({ key: address.toLowerCase(), address })
    }
    return list
  }, [tokens])

  const phase1Contracts = useMemo<ContractFunctionParameters[]>(
    () =>
      entries.flatMap((e) => [
        {
          address: e.address,
          abi: flapTaxTokenV3Abi,
          functionName: 'totalSupply',
          chainId: PLATFORM_CHAIN_ID,
        },
        {
          address: e.address,
          abi: flapTaxTokenV3Abi,
          functionName: 'decimals',
          chainId: PLATFORM_CHAIN_ID,
        },
        {
          ...coordinator,
          functionName: 'tokenPresales',
          args: [e.address],
          chainId: PLATFORM_CHAIN_ID,
        },
        {
          address: e.address,
          abi: flapTaxTokenV3Abi,
          functionName: 'state',
          chainId: PLATFORM_CHAIN_ID,
        },
      ]),
    [entries, coordinator],
  )

  const { data: phase1Data } = useReadContracts({
    contracts: phase1Contracts,
    query: { enabled: phase1Contracts.length > 0, staleTime: 60_000 },
  })

  const tokenStates = useMemo(() => {
    return entries.map((e, i) => {
      // Slot order matches the flatMap layout: 4 reads per token.
      const supply = slot(phase1Data, i * 4)
      const decimals = slot(phase1Data, i * 4 + 1)
      const presale = slot(phase1Data, i * 4 + 2)
      const state = slot(phase1Data, i * 4 + 3)
      return {
        key: e.key,
        totalSupply:
          supply?.status === 'success' ? (supply.result as bigint) : undefined,
        tokenDecimals:
          decimals?.status === 'success' ? Number(decimals.result) : 18,
        presale:
          presale?.status === 'success' && presale.result !== zeroAddress
            ? (presale.result as Address)
            : null,
        tokenState:
          state?.status === 'success' ? Number(state.result) : undefined,
      }
    })
  }, [entries, phase1Data])

  const presaleStates = useMemo(
    () =>
      tokenStates.flatMap((s) =>
        s.presale ? [{ ...s, presale: s.presale }] : [],
      ),
    [tokenStates],
  )

  const phase2Contracts = useMemo<ContractFunctionParameters[]>(
    () =>
      presaleStates.flatMap((s) => [
        {
          address: s.presale,
          abi: presaleAbi,
          functionName: 'lpAddress',
          chainId: PLATFORM_CHAIN_ID,
        },
        {
          address: s.presale,
          abi: presaleAbi,
          functionName: 'getLaunchStatus',
          chainId: PLATFORM_CHAIN_ID,
        },
        {
          address: s.presale,
          abi: presaleAbi,
          functionName: 'presaleTokenPrice',
          chainId: PLATFORM_CHAIN_ID,
        },
      ]),
    [presaleStates],
  )

  const { data: phase2Data } = useReadContracts({
    contracts: phase2Contracts,
    query: {
      enabled: phase2Contracts.length > 0,
      staleTime: 30_000,
      refetchInterval: 30_000,
    },
  })

  const pairStates = useMemo(() => {
    return presaleStates.map((s, i) => {
      const lp = slot(phase2Data, i * 3)
      const launch = slot(phase2Data, i * 3 + 1)
      const price = slot(phase2Data, i * 3 + 2)
      // Token-only launches may revert on presaleTokenPrice; a failed slot is tolerated.
      const presalePriceRaw =
        price?.status === 'success' ? (price.result as bigint) : null
      const pairAddr = lp?.status === 'success' ? (lp.result as Address) : null
      return {
        ...s,
        pair: pairAddr && pairAddr !== zeroAddress ? pairAddr : null,
        launchStatus:
          launch?.status === 'success'
            ? (launch.result as LaunchStatus)
            : null,
        presalePrice:
          presalePriceRaw && presalePriceRaw > 0n ? presalePriceRaw : null,
      }
    })
  }, [presaleStates, phase2Data])

  const liveCandidates = useMemo(
    () => pairStates.flatMap((s) => (s.pair ? [{ ...s, pair: s.pair }] : [])),
    [pairStates],
  )

  const phase3Contracts = useMemo<ContractFunctionParameters[]>(
    () =>
      liveCandidates.flatMap((s) => [
        {
          address: s.pair,
          abi: pairAbi,
          functionName: 'token0',
          chainId: PLATFORM_CHAIN_ID,
        },
        {
          address: s.pair,
          abi: pairAbi,
          functionName: 'getReserves',
          chainId: PLATFORM_CHAIN_ID,
        },
      ]),
    [liveCandidates],
  )

  const { data: phase3Data } = useReadContracts({
    contracts: phase3Contracts,
    query: {
      enabled: phase3Contracts.length > 0,
      staleTime: 15_000,
      refetchInterval: 15_000,
    },
  })

  const aggregated = useMemo(() => {
    const map: Record<string, BoardTokenPricing> = {}
    for (const s of tokenStates) {
      map[s.key] = {
        totalSupply: s.totalSupply,
        stage: 'not_launched',
        priceBNB: null,
        bnbReserve: null,
        changePercent: null,
        volume24h: null,
        liquidityUsd: null,
      }
    }

    for (const s of pairStates) {
      // Claimed means the escrow flag is set or the token state reached >= 2.
      const claimed = s.launchStatus?.[5] === true || (s.tokenState ?? 0) >= 2
      const launchEnabled = s.launchStatus?.[0] === true
      const launchStep = s.launchStatus ? Number(s.launchStatus[1]) : -1

      if (claimed) {
        map[s.key] = {
          totalSupply: s.totalSupply,
          stage: 'live',
          priceBNB: null,
          bnbReserve: null,
          changePercent: null,
          volume24h: null,
          liquidityUsd: null,
        }
        continue
      }

      if (launchEnabled && launchStep >= 0 && launchStep <= 2) {
        map[s.key] = {
          totalSupply: s.totalSupply,
          stage: launchStep === 2 ? 'awaiting_launch' : 'presale',
          priceBNB: s.presalePrice
            ? Number(formatUnits(s.presalePrice, 18))
            : null,
          bnbReserve: null,
          changePercent: null,
          volume24h: null,
          liquidityUsd: null,
        }
        continue
      }

      if (launchEnabled && launchStep === 4) {
        map[s.key] = {
          totalSupply: s.totalSupply,
          stage: 'failed',
          priceBNB: null,
          bnbReserve: null,
          changePercent: null,
          volume24h: null,
          liquidityUsd: null,
        }
      }
    }

    liveCandidates.forEach((s, i) => {
      const t0 = slot(phase3Data, i * 2)
      const reserves = slot(phase3Data, i * 2 + 1)
      const t0Addr = t0?.status === 'success' ? (t0.result as Address) : null
      const [r0, r1] =
        reserves?.status === 'success'
          ? (reserves.result as readonly [bigint, bigint, number])
          : [null, null]
      if (!t0Addr || r0 === null || r1 === null) return

      const isT0 = t0Addr.toLowerCase() === s.key
      const tokenReserve = isT0 ? r0 : r1
      const bnbReserve = isT0 ? r1 : r0
      if (tokenReserve <= 0n) return

      map[s.key] = {
        totalSupply: s.totalSupply,
        stage: 'live',
        priceBNB:
          Number(formatUnits(bnbReserve, 18)) /
          Number(formatUnits(tokenReserve, s.tokenDecimals)),
        bnbReserve,
        changePercent: null,
        volume24h: null,
        liquidityUsd: null,
      }
    })

    return map
  }, [tokenStates, pairStates, liveCandidates, phase3Data])

  // Market data comes from the DEX aggregator (through the dex-cache worker).
  // The on-chain reads above stay authoritative for the launch stage.
  const { data: dexData } = useDexQuotes(entries.map((entry) => entry.address))

  return useMemo(() => {
    const quotes = dexData?.quotes ?? {}
    const out: Record<string, BoardTokenPricing> = {}

    for (const [key, pricing] of Object.entries(aggregated)) {
      const quote = quotes[key]
      // priceNative is only a BNB price when the pair is quoted in WBNB.
      const dexPriceBNB =
        quote?.priceNative != null &&
        quote.quoteTokenAddress.toLowerCase() ===
          WRAPPED_NATIVE_ADDRESS.toLowerCase()
          ? quote.priceNative
          : null

      out[key] = {
        ...pricing,
        priceBNB: dexPriceBNB ?? pricing.priceBNB,
        // Real 24h change; null means "no live market" and renders as --.
        changePercent: quote?.change24h ?? null,
        volume24h: quote?.volume24h ?? null,
        liquidityUsd: quote?.liquidityUsd ?? null,
      }
    }

    return out
  }, [aggregated, dexData])
}
