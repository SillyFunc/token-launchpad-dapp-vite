/**
 * Local mock of the DEX Screener `/tokens/v1/{chain}/{addresses}` endpoint.
 * Used to verify the worker's aggregation + filtering without external network.
 *
 * Run: node test/mock-dex.mjs   (listens on http://127.0.0.1:9099)
 *
 * Fixture design:
 *  - TOKEN_A : two pools -> the higher-liquidity one must win
 *  - TOKEN_B : not launched (no priceUsd, zero liquidity) -> must be filtered out
 *  - TOKEN_C : single healthy pool
 *  - TOKEN_D : has price but zero liquidity -> must be filtered out
 */
import { createServer } from 'node:http'

const TOKEN_A = '0xaaaa000000000000000000000000000000000001'
const TOKEN_B = '0xbbbb000000000000000000000000000000000002'
const TOKEN_C = '0xcccc000000000000000000000000000000000003'
const TOKEN_D = '0xdddd000000000000000000000000000000000004'
const TOKEN_E = '0xeeee000000000000000000000000000000000005'

const pair = (over = {}) => ({
  chainId: 'bsc',
  dexId: 'pancakeswap',
  pairAddress: '0x0000000000000000000000000000000000000000',
  baseToken: { address: TOKEN_A, name: 'Token A', symbol: 'TKA' },
  quoteToken: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', name: 'WBNB', symbol: 'WBNB' },
  priceNative: '0.000001',
  priceUsd: '0.001',
  txns: { h24: { buys: 10, sells: 5 } },
  volume: { h24: 1000 },
  priceChange: { h24: 1.5 },
  liquidity: { usd: 5000, base: 100, quote: 10 },
  fdv: 100000,
  marketCap: 100000,
  pairCreatedAt: 1700000000000,
  ...over,
})

const FIXTURE = [
  // TOKEN_A: low liquidity pool (should lose)
  pair({
    pairAddress: '0x1111000000000000000000000000000000000001',
    priceChange: { h24: -9.9 },
    liquidity: { usd: 100, base: 1, quote: 1 },
  }),
  // TOKEN_A: high liquidity pool (should win)
  pair({
    pairAddress: '0x1111000000000000000000000000000000000002',
    priceNative: '0.00000333',
    priceChange: { h24: 12.34 },
    liquidity: { usd: 42000, base: 1, quote: 1 },
    volume: { h24: 7777 },
    txns: { h24: { buys: 30, sells: 11 } },
  }),
  // TOKEN_B: presale / not launched
  pair({
    baseToken: { address: TOKEN_B, name: 'Token B', symbol: 'TKB' },
    pairAddress: '0x2222000000000000000000000000000000000001',
    priceUsd: undefined,
    priceNative: undefined,
    liquidity: { usd: 0, base: 0, quote: 0 },
  }),
  // TOKEN_C: healthy single pool
  pair({
    baseToken: { address: TOKEN_C, name: 'Token C', symbol: 'TKC' },
    pairAddress: '0x3333000000000000000000000000000000000001',
    priceNative: '0.5',
    priceChange: { h24: -3.21 },
    liquidity: { usd: 12000, base: 1, quote: 1 },
  }),
  // TOKEN_D: has price but no liquidity -> filtered
  pair({
    baseToken: { address: TOKEN_D, name: 'Token D', symbol: 'TKD' },
    pairAddress: '0x4444000000000000000000000000000000000001',
    liquidity: { usd: 0, base: 0, quote: 0 },
  }),
  // TOKEN_E: live but quoted in USDT, not WBNB -> must be distinguishable
  pair({
    baseToken: { address: TOKEN_E, name: 'Token E', symbol: 'TKE' },
    quoteToken: { address: '0x55d398326f99059fF775485246999027B3197955', name: 'Tether USD', symbol: 'USDT' },
    pairAddress: '0x5555000000000000000000000000000000000001',
    priceNative: '0.5',
    priceChange: { h24: 5 },
    liquidity: { usd: 9000, base: 1, quote: 1 },
  }),
]

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1:9099')

  if (url.pathname === '/__reset') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (url.pathname === '/__shutdown') {
    // Lets the cache test simulate an upstream outage.
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, message: 'shutting down' }))
    console.log('[mock-dex] shutdown requested')
    setTimeout(() => {
      server.close(() => process.exit(0))
    }, 50)
    return
  }

  const match = url.pathname.match(/^\/tokens\/v1\/([^/]+)\/(.+)$/)
  if (!match) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
    return
  }

  const requested = match[2].split(',').map((t) => t.trim().toLowerCase())
  const filtered = FIXTURE.filter((p) =>
    requested.includes(p.baseToken.address.toLowerCase()),
  )

  console.log(`[mock-dex] ${requested.length} token(s) requested -> ${filtered.length} pair(s)`)
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(filtered))
})

server.listen(9099, '127.0.0.1', () => {
  console.log('[mock-dex] listening on http://127.0.0.1:9099')
  console.log(`[mock-dex] tokens: A=${TOKEN_A} B=${TOKEN_B} C=${TOKEN_C} D=${TOKEN_D} E=${TOKEN_E}`)
})
