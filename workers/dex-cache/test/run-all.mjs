/**
 * One-shot verification runner for the dex-cache worker.
 *
 * Boots the mock upstream + mock Upstash, starts `wrangler dev` pointed at them
 * (CACHE_TTL_SECONDS=3 so the STALE path is reachable), then runs:
 *   1. test/verify.mjs        - aggregation, filtering, validation
 *   2. test/verify-cache.mjs  - MISS -> HIT -> STALE
 *
 * Run: node test/run-all.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const children = []
const isWindows = process.platform === 'win32'

function start(label, args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (d) => process.stdout.write(`  [${label}] ${d}`))
  child.stderr.on('data', (d) => process.stderr.write(`  [${label}] ${d}`))
  children.push(child)
  return child
}

function kill(child) {
  if (!child || child.killed) return
  if (isWindows) {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch {
      /* ignore */
    }
  } else {
    child.kill('SIGTERM')
  }
}

async function waitFor(url, timeoutMs = 90_000, label = url) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await sleep(700)
  }
  console.error(`Timed out waiting for ${label}`)
  return false
}

function runNode(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], { cwd: root, stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

// Keep the developer's real .dev.vars out of the way during the test run.
const devVars = join(root, '.dev.vars')
const devVarsBackup = join(root, '.dev.vars.test-backup')
let restored = false

function restoreDevVars() {
  if (restored) return
  restored = true
  if (existsSync(devVarsBackup)) renameSync(devVarsBackup, devVars)
}

async function main() {
  if (existsSync(devVars)) renameSync(devVars, devVarsBackup)

  console.log('Starting mocks...')
  start('mock-upstash', ['test/mock-upstash.mjs'])
  start('mock-dex', ['test/mock-dex.mjs'])

  const upstashReady = await waitFor('http://127.0.0.1:9098/ping', 20_000, 'mock-upstash')
  const dexReady = await waitFor(
    'http://127.0.0.1:9099/tokens/v1/bsc/0xaaaa000000000000000000000000000000000001',
    20_000,
    'mock-dex',
  )
  if (!upstashReady || !dexReady) throw new Error('mocks failed to start')

  console.log('Starting wrangler dev (test bindings)...')
  start('wrangler', [
    'node_modules/wrangler/bin/wrangler.js',
    'dev',
    '--config',
    'wrangler.test.toml',
    '--port',
    '8787',
    '--var',
    'UPSTASH_REDIS_REST_URL:http://127.0.0.1:9098',
    '--var',
    'UPSTASH_REDIS_REST_TOKEN:test-token',
    '--var',
    'DEX_API_BASE:http://127.0.0.1:9099',
    '--var',
    'CACHE_TTL_SECONDS:3',
    '--var',
    'DEX_CHAIN_SLUG:bsc',
    '--var',
    'MAX_TOKENS_PER_REQUEST:30',
  ])

  if (!(await waitFor('http://127.0.0.1:8787/health', 120_000, 'wrangler dev'))) {
    throw new Error('wrangler dev failed to start')
  }

  console.log('\n=== verify.mjs (aggregation / filtering / validation) ===')
  const first = await runNode('test/verify.mjs')
  console.log(`  -> verify.mjs exit code: ${first}`)

  console.log('\n=== verify-cache.mjs (MISS -> HIT -> STALE) ===')
  const second = await runNode('test/verify-cache.mjs')
  console.log(`  -> verify-cache.mjs exit code: ${second}`)

  const failed = first !== 0 || second !== 0
  console.log(`\n${failed ? 'SUITE FAILED' : 'SUITE PASSED'}`)
  return failed ? 1 : 0
}

let exitCode = 1
try {
  exitCode = await main()
} catch (err) {
  console.error('Runner error:', err)
  exitCode = 1
} finally {
  for (const child of children) kill(child)
  // Give Windows a moment to reap the process tree; exiting immediately races
  // with libuv handle teardown and can trip an assertion in async.c.
  await sleep(1_200)
  restoreDevVars()
}
process.exit(exitCode)
