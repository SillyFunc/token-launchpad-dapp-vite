/**
 * In-memory mock of the Upstash Redis REST API, used to verify the worker's
 * cache HIT / MISS / STALE behaviour without a real Upstash database.
 *
 * Run: node test/mock-upstash.mjs   (listens on http://127.0.0.1:9098)
 *
 * Supports the subset the worker uses: GET/SET (path form and POST body form),
 * plus the /pipeline endpoint used by @upstash/redis for batched commands.
 */
import { createServer } from 'node:http'

const store = new Map() // key -> { value: string, expiresAt: number | null }

function now() {
  return Date.now()
}

function read(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (entry.expiresAt !== null && entry.expiresAt <= now()) {
    store.delete(key)
    return null
  }
  return entry
}

function write(key, value, ttlSeconds) {
  store.set(key, {
    value,
    expiresAt: ttlSeconds ? now() + ttlSeconds * 1000 : null,
  })
}

/** Execute one Redis command, returning the raw result (or throwing). */
function exec(args) {
  const [rawCmd, ...rest] = args
  const cmd = String(rawCmd).toLowerCase()

  if (cmd === 'get') {
    const entry = read(String(rest[0]))
    return entry ? entry.value : null
  }

  if (cmd === 'set') {
    const key = String(rest[0])
    const value = String(rest[1])
    let ttl = null
    for (let i = 2; i < rest.length; i++) {
      const token = String(rest[i]).toLowerCase()
      if ((token === 'ex' || token === 'px') && rest[i + 1] !== undefined) {
        const amount = Number(rest[i + 1])
        ttl = token === 'ex' ? amount : amount / 1000
        i++
      }
    }
    write(key, value, ttl)
    return 'OK'
  }

  if (cmd === 'del') {
    let removed = 0
    for (const key of rest) if (store.delete(String(key))) removed++
    return removed
  }

  if (cmd === 'ping') return 'PONG'

  throw new Error(`unsupported command: ${cmd}`)
}

function respond(res, result, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ result }))
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1:9098')
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  const isRead = segments[0]?.toLowerCase() === 'get'
  const label = isRead ? 'GET' : segments[0]?.toLowerCase() === 'set' ? 'SET' : (segments[0] ?? '?')

  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
    try {
      // Batched commands: POST /pipeline with a JSON array of command arrays.
      if (segments[0] === 'pipeline' || segments[0] === 'multi-exec') {
        const commands = JSON.parse(body || '[]')
        const results = commands.map((args) => {
          try {
            return { result: exec(args) }
          } catch (err) {
            return { error: String(err.message ?? err) }
          }
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(results))
        console.log(`[mock-upstash] PIPELINE ${commands.length} cmd(s) -> ${commands.map((c) => c[0]).join(',')}`)
        return
      }

      const args = [...segments]
      if (body) args.push(body) // POST body is appended as the last argument

      // TTL may arrive as query params instead of path segments.
      const ex = url.searchParams.get('EX') ?? url.searchParams.get('ex')
      const px = url.searchParams.get('PX') ?? url.searchParams.get('px')
      if (ex) args.push('EX', ex)
      if (px) args.push('PX', px)

      const result = exec(args)
      const preview = typeof result === 'string' ? result.slice(0, 40) : result
      console.log(`[mock-upstash] ${label} ${segments[1] ?? ''} -> ${result === null ? 'nil' : preview}`)
      respond(res, result)
    } catch (err) {
      console.log(`[mock-upstash] ERROR ${err.message}`)
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: String(err.message ?? err) }))
    }
  })
})

server.listen(9098, '127.0.0.1', () => {
  console.log('[mock-upstash] listening on http://127.0.0.1:9098')
})

// Debug helper: inspect current keys via GET /__dump
server.on('request', () => {})
