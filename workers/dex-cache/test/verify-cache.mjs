/**
 * Verifies the worker's caching behaviour: MISS -> HIT -> STALE.
 *
 * Prerequisites:
 *   - `node test/mock-upstash.mjs`  (port 9098)
 *   - `node test/mock-dex.mjs`      (port 9099)
 *   - `wrangler dev --port 8787` with CACHE_TTL_SECONDS=3 and
 *     DEX_API_BASE=http://127.0.0.1:9099 (see test/.dev.vars.cache-test)
 *
 * Run: node test/verify-cache.mjs
 */
const WORKER = 'http://127.0.0.1:8787'
const MOCK_DEX = 'http://127.0.0.1:9099'
const TOKEN_A = '0xaaaa000000000000000000000000000000000001'
const TOKEN_C = '0xcccc000000000000000000000000000000000003'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let failures = 0
function check(name, condition, detail = '') {
  if (condition) console.log(`  PASS  ${name}`)
  else {
    failures++
    console.log(`  FAIL  ${name}${detail ? ` :: ${detail}` : ''}`)
  }
}

async function get(path) {
  const res = await fetch(`${WORKER}${path}`)
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) }
}

const target = `/quotes?tokens=${TOKEN_A},${TOKEN_C}`

console.log('\n1) first call -> MISS (populates cache)')
{
  const r = await get(target)
  check('status 200', r.status === 200, `got ${r.status}`)
  check('x-cache MISS', r.headers.get('x-cache') === 'MISS', `got ${r.headers.get('x-cache')}`)
  check('body.cache MISS', r.body?.cache === 'MISS', `got ${r.body?.cache}`)
  check('quotes returned', Object.keys(r.body?.quotes ?? {}).length === 2)
}

await sleep(300) // let the non-blocking write settle

console.log('\n2) second call within TTL -> HIT')
{
  const r = await get(target)
  check('x-cache HIT', r.headers.get('x-cache') === 'HIT', `got ${r.headers.get('x-cache')}`)
  check('body.cache HIT', r.body?.cache === 'HIT', `got ${r.body?.cache}`)
  check('HIT returns same quotes', Object.keys(r.body?.quotes ?? {}).length === 2)
}

console.log('\n3) after TTL expiry with upstream DOWN -> STALE')
{
  console.log('     stopping mock DEX upstream...')
  try {
    await fetch(`${MOCK_DEX}/__shutdown`).catch(() => {})
  } catch {
    /* ignore */
  }
  console.log('     (kill mock-dex.mjs manually if it is still up)')

  await sleep(3500) // exceed the 3s fresh TTL, stay within the 30s stale TTL

  const r = await get(target)
  check('status 200 (degraded, not an error)', r.status === 200, `got ${r.status}`)
  check('x-cache STALE', r.headers.get('x-cache') === 'STALE', `got ${r.headers.get('x-cache')}`)
  check('body.cache STALE', r.body?.cache === 'STALE', `got ${r.body?.cache}`)
  check('stale payload still has quotes', Object.keys(r.body?.quotes ?? {}).length === 2)
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
// See verify.mjs: avoid process.exit() to dodge a Windows libuv assertion.
process.exitCode = failures === 0 ? 0 : 1
