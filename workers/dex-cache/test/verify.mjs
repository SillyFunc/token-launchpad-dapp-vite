/**
 * Verifies the worker's /quotes endpoint against the local mock upstream.
 * Requires: `node test/mock-dex.mjs` running, and `wrangler dev` on :8787
 * with DEX_API_BASE=http://127.0.0.1:9099 (see test/.dev.vars.test).
 *
 * Run: node test/verify.mjs
 */
const WORKER = 'http://127.0.0.1:8787'
const TOKEN_A = '0xaaaa000000000000000000000000000000000001'
const TOKEN_B = '0xbbbb000000000000000000000000000000000002'
const TOKEN_C = '0xcccc000000000000000000000000000000000003'
const TOKEN_D = '0xdddd000000000000000000000000000000000004'
const TOKEN_E = '0xeeee000000000000000000000000000000000005'

let failures = 0

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`)
  } else {
    failures++
    console.log(`  FAIL  ${name}${detail ? ` :: ${detail}` : ''}`)
  }
}

async function get(path) {
  const res = await fetch(`${WORKER}${path}`)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, headers: res.headers, body }
}

// ---- health ----
console.log('\n/health')
{
  const r = await get('/health')
  check('status 200', r.status === 200, `got ${r.status}`)
  check('body.ok === true', r.body?.ok === true)
}

// ---- happy path: A (2 pools), B (not launched), C (live), D (no liquidity) ----
console.log('\n/quotes?tokens=A,B,C,D')
{
  const r = await get(`/quotes?tokens=${TOKEN_A},${TOKEN_B},${TOKEN_C},${TOKEN_D}`)
  check('status 200', r.status === 200, `got ${r.status}`)
  check('CORS allow-origin present', r.headers.get('access-control-allow-origin') === '*')
  check('x-cache is MISS', r.headers.get('x-cache') === 'MISS', `got ${r.headers.get('x-cache')}`)

  const quotes = r.body?.quotes ?? {}
  check('TOKEN_A present', !!quotes[TOKEN_A])
  check('TOKEN_B filtered out (not launched)', !quotes[TOKEN_B])
  check('TOKEN_C present', !!quotes[TOKEN_C])
  check('TOKEN_D filtered out (zero liquidity)', !quotes[TOKEN_D])

  const a = quotes[TOKEN_A]
  check(
    'TOKEN_A picks highest-liquidity pool',
    a?.pairAddress?.toLowerCase() === '0x1111000000000000000000000000000000000002',
    `got ${a?.pairAddress}`,
  )
  check('TOKEN_A change24h from winning pool', a?.change24h === 12.34, `got ${a?.change24h}`)
  check('TOKEN_A liquidityUsd', a?.liquidityUsd === 42000, `got ${a?.liquidityUsd}`)
  check('TOKEN_A volume24h', a?.volume24h === 7777, `got ${a?.volume24h}`)
  check('TOKEN_A txns24h', a?.txns24h?.buys === 30 && a?.txns24h?.sells === 11)
  check('TOKEN_A priceNative numeric', a?.priceNative === 0.00000333, `got ${a?.priceNative}`)

  const c = quotes[TOKEN_C]
  check('TOKEN_C negative change preserved', c?.change24h === -3.21, `got ${c?.change24h}`)
  check('TOKEN_C priceNative', c?.priceNative === 0.5, `got ${c?.priceNative}`)
}

// ---- quote token must be reported so callers know what priceNative means ----
console.log('\nquote token reporting')
{
  const r = await get(`/quotes?tokens=${TOKEN_A},${TOKEN_E}`)
  const quotes = r.body?.quotes ?? {}
  check('TOKEN_A quoted in WBNB', quotes[TOKEN_A]?.quoteTokenSymbol === 'WBNB', `got ${quotes[TOKEN_A]?.quoteTokenSymbol}`)
  check('TOKEN_E quoted in USDT', quotes[TOKEN_E]?.quoteTokenSymbol === 'USDT', `got ${quotes[TOKEN_E]?.quoteTokenSymbol}`)
  check('quote token address reported', /^0x[0-9a-fA-F]{40}$/.test(quotes[TOKEN_E]?.quoteTokenAddress ?? ''))
}

// ---- contract: every field src/api/dex.ts declares must be present ----
console.log('\nresponse contract (must match src/api/dex.ts DexTokenQuote)')
{
  const r = await get(`/quotes?tokens=${TOKEN_A}`)
  const quote = r.body?.quotes?.[TOKEN_A] ?? {}
  const required = [
    'tokenAddress',
    'pairAddress',
    'dexId',
    'priceNative',
    'priceUsd',
    'quoteTokenAddress',
    'quoteTokenSymbol',
    'change24h',
    'volume24h',
    'liquidityUsd',
    'txns24h',
    'marketCap',
    'pairCreatedAt',
  ]
  const missing = required.filter((field) => !(field in quote))
  check('all DexTokenQuote fields present', missing.length === 0, `missing: ${missing.join(', ')}`)
  check('top-level has quotes/cache/timestamp', ['quotes', 'cache', 'timestamp'].every((k) => k in (r.body ?? {})))
  check('cache is a known status', ['HIT', 'MISS', 'STALE'].includes(r.body?.cache))
}

// ---- input validation ----
console.log('\nvalidation')
{
  const r1 = await get('/quotes')
  check('missing tokens -> 400', r1.status === 400, `got ${r1.status}`)

  const r2 = await get('/quotes?tokens=not-an-address')
  check('invalid address -> 400', r2.status === 400, `got ${r2.status}`)

  const many = Array.from({ length: 31 }, (_, i) =>
    `0x${String(i).padStart(40, '0')}`,
  ).join(',')
  const r3 = await get(`/quotes?tokens=${many}`)
  check('31 tokens -> 400 (max 30)', r3.status === 400, `got ${r3.status}`)

  const r4 = await get('/nope')
  check('unknown path -> 404', r4.status === 404, `got ${r4.status}`)
}

// ---- dedupe + normalization ----
console.log('\ndedupe / normalization')
{
  const r = await get(`/quotes?tokens=${TOKEN_A},${TOKEN_A.toUpperCase()},${TOKEN_A}`)
  check('duplicate + mixed-case tokens -> 200', r.status === 200, `got ${r.status}`)
  check('single aggregated quote returned', Object.keys(r.body?.quotes ?? {}).length === 1)
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
// Use exitCode instead of process.exit(): forcing exit while undici's keep-alive
// sockets are tearing down trips a libuv assertion on Windows.
process.exitCode = failures === 0 ? 0 : 1
