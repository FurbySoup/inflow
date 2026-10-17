// @vitest-environment node
// End-to-end checks against a real http server on an ephemeral port. Upstreams are faked via fetchImpl.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { request as httpRequest, createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { proxyRoutes } from '../proxy/routes'
import { createApp } from './app'
import type { FetchLike } from './proxy'

const ALLOWED_ORIGINS = new Set(proxyRoutes().map((r) => r.target))

let root: string
let server: Server
let port: number
let seen: { url: string; init: RequestInit }[] = []
let respond: (url: string, init: RequestInit) => Promise<Response>

const fetchImpl: FetchLike = async (url, init) => {
  seen.push({ url, init })
  return respond(url, init)
}

function defaultUpstream(): Promise<Response> {
  return Promise.resolve(
    new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': 'sid=1; Path=/', etag: '"abc"' },
    }),
  )
}

interface Reply {
  status: number
  headers: IncomingHttpHeaders
  body: string
}

/** Sends a raw request. `path` is used verbatim, so it can carry the traversal and absolute-form cases. */
function raw(opts: { path: string; method?: string; headers?: Record<string, string>; body?: string }): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { host: '127.0.0.1', port, method: opts.method ?? 'GET', path: opts.path, headers: opts.headers },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }),
        )
      },
    )
    req.on('error', reject)
    if (opts.body !== undefined) req.write(opts.body)
    req.end()
  })
}

function expectSecurityHeaders(headers: IncomingHttpHeaders): void {
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['x-frame-options']).toBe('SAMEORIGIN')
}

function expectOnlyAllowedOrigins(): void {
  for (const call of seen) expect(ALLOWED_ORIGINS.has(new URL(call.url).origin)).toBe(true)
}

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'inflow-server-'))
  const dist = path.join(root, 'dist')
  await mkdir(path.join(dist, 'assets'), { recursive: true })
  await writeFile(path.join(dist, 'index.html'), '<!doctype html><title>INDEX</title>')
  await writeFile(path.join(dist, 'assets', 'app-abc123.js'), 'console.log("app")')
  await writeFile(path.join(root, 'secret.txt'), 'TOP-SECRET')

  const app = createApp({
    routes: proxyRoutes({ NWS_CONTACT: 'ops@example.test' }),
    distDir: dist,
    fetchImpl,
    now: () => Date.now(),
  })
  server = createServer((req, res) => void app(req, res))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await rm(root, { recursive: true, force: true })
})

beforeEach(() => {
  seen = []
  respond = defaultUpstream
})

describe('healthz', () => {
  it('answers ok as text/plain', async () => {
    const res = await raw({ path: '/healthz' })
    expect(res.status).toBe(200)
    expect(res.body).toBe('ok')
    expect(res.headers['content-type']).toMatch(/^text\/plain/)
    expectSecurityHeaders(res.headers)
  })

  it('rejects POST', async () => {
    const res = await raw({ path: '/healthz', method: 'POST', body: 'x' })
    expect(res.status).toBe(405)
  })
})

describe('static', () => {
  it('serves index.html for /, revalidated', async () => {
    const res = await raw({ path: '/' })
    expect(res.status).toBe(200)
    expect(res.body).toContain('INDEX')
    expect(res.headers['content-type']).toMatch(/^text\/html/)
    expect(res.headers['cache-control']).toBe('no-cache')
    expectSecurityHeaders(res.headers)
  })

  it('serves hashed assets as immutable', async () => {
    const res = await raw({ path: '/assets/app-abc123.js' })
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(res.headers['content-type']).toMatch(/^text\/javascript/)
    expect(res.body).toBe('console.log("app")')
  })

  it('answers HEAD without a body', async () => {
    const res = await raw({ path: '/', method: 'HEAD' })
    expect(res.status).toBe(200)
    expect(res.body).toBe('')
  })

  it('404s an unknown path', async () => {
    const res = await raw({ path: '/no-such-page' })
    expect(res.status).toBe(404)
    expectSecurityHeaders(res.headers)
  })

  it('refuses traversal out of dist', async () => {
    for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%2e%2e%2fsecret.txt', '/%ZZ']) {
      const res = await raw({ path: p })
      expect(res.status, p).toBe(404)
      expect(res.body, p).not.toContain('TOP-SECRET')
    }
  })

  it('rejects POST to the app with 405 and Allow', async () => {
    const res = await raw({ path: '/', method: 'POST', body: 'x' })
    expect(res.status).toBe(405)
    expect(res.headers.allow).toBe('GET, HEAD')
  })
})

describe('proxy routing', () => {
  it('maps the query string and upstreamPath', async () => {
    await raw({ path: '/api/nws/alerts/active?area=GA' })
    await raw({ path: '/api/kandrive/x?y=1' })
    expect(seen.map((c) => c.url)).toEqual([
      'https://api.weather.gov/alerts/active?area=GA',
      'https://www.kandrive.gov/api/x?y=1',
    ])
  })

  it('is not an open proxy: tricky paths only ever reach allowlisted origins', async () => {
    const paths = [
      '/api/nws/..%2f..%2fevil',
      '/api/nws//evil.example/x',
      '/api/nws/@evil.example/x',
      '/api/nws/\\\\evil.example/x',
      '/api/unknown/x',
      '/api/nwsx/alerts',
      '/api',
    ]
    for (const p of paths) await raw({ path: p })
    await raw({ path: 'http://evil.example/' })
    await raw({ path: '//evil.example/x' })
    expectOnlyAllowedOrigins()
    expect(seen.map((c) => new URL(c.url).hostname)).not.toContain('evil.example')
    // Only the four /api/nws paths reach upstream; the rest are refused before any fetch.
    expect(seen).toHaveLength(4)
  })

  it('400s absolute-form and protocol-relative request targets without calling upstream', async () => {
    const abs = await raw({ path: 'http://evil.example/api/nws/x' })
    const rel = await raw({ path: '//evil.example/api/nws/x' })
    expect(abs.status).toBe(400)
    expect(rel.status).toBe(400)
    expect(seen).toHaveLength(0)
  })

  it('404s unknown /api routes and does not call upstream', async () => {
    expect((await raw({ path: '/api/unknown/x' })).status).toBe(404)
    expect((await raw({ path: '/api/nwsx/alerts' })).status).toBe(404)
    expect(seen).toHaveLength(0)
  })

  it('answers POST to /api/nws with 405', async () => {
    const res = await raw({ path: '/api/nws/alerts', method: 'POST', body: '{}' })
    expect(res.status).toBe(405)
    expect(res.headers.allow).toBe('GET')
    expect(seen).toHaveLength(0)
  })

  it('forwards a CARS POST body and content-type', async () => {
    const body = '{"query":"{ cameras }"}'
    const res = await raw({
      path: '/api/kandrive/graphql',
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) },
      body,
    })
    expect(res.status).toBe(200)
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toBe('https://www.kandrive.gov/api/graphql')
    expect(seen[0].init.method).toBe('POST')
    expect(new TextDecoder().decode(seen[0].init.body as Uint8Array)).toBe(body)
    expect((seen[0].init.headers as Record<string, string>)['content-type']).toBe('application/json')
  })

  it('does not forward cookies or authorization, and does not return set-cookie', async () => {
    const res = await raw({ path: '/api/txdot/x', headers: { cookie: 'sid=secret', authorization: 'Bearer x' } })
    const sent = seen[0].init.headers as Record<string, string>
    expect(sent).not.toHaveProperty('cookie')
    expect(sent).not.toHaveProperty('authorization')
    expect(res.headers).not.toHaveProperty('set-cookie')
    expect(res.headers.etag).toBe('"abc"')
  })

  it('sends the NWS User-Agent from the route', async () => {
    await raw({ path: '/api/nws/alerts/active' })
    expect((seen[0].init.headers as Record<string, string>)['user-agent']).toBe('INFLOW storm-chasers (ops@example.test)')
  })

  it('passes a 3xx back without following it', async () => {
    respond = () =>
      Promise.resolve(new Response(null, { status: 302, headers: { location: 'https://m.youtube.com/watch?v=x' } }))
    const res = await raw({ path: '/api/youtube/watch?v=x' })
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('https://m.youtube.com/watch?v=x')
    expect(seen).toHaveLength(1)
  })

  it('answers 502 when upstream fails', async () => {
    respond = () => Promise.reject(new TypeError('fetch failed'))
    const res = await raw({ path: '/api/txdot/down' })
    expect(res.status).toBe(502)
    expectSecurityHeaders(res.headers)
  })

  it('caches a repeated GET', async () => {
    await raw({ path: '/api/511sc/cameras' })
    await raw({ path: '/api/511sc/cameras' })
    expect(seen).toHaveLength(1)
  })

  it('sends security headers on proxy responses', async () => {
    const res = await raw({ path: '/api/txdot/x' })
    expectSecurityHeaders(res.headers)
  })
})
