// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { REPO_URL, matchRoute, proxyRoutes } from '../proxy/routes'
import { createResponseCache } from './cache'
import {
  handleProxy,
  readLimitedBody,
  upstreamUrl,
  type FetchLike,
  type ProxyDeps,
  type ProxyInput,
} from './proxy'

const routes = proxyRoutes({ NWS_CONTACT: 'ops@example.test' })

interface Seen {
  url: string
  init: RequestInit
}

function fakeUpstream(respond: (url: string) => Response | Promise<Response> = () => okJson()) {
  const seen: Seen[] = []
  const fetchImpl: FetchLike = async (url, init) => {
    seen.push({ url, init })
    return respond(url)
  }
  return { seen, fetchImpl }
}

function okJson(extra: Record<string, string> = {}): Response {
  return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json', ...extra } })
}

function harness(fetchImpl: FetchLike) {
  const clock = { now: 1_000_000 }
  const deps: ProxyDeps = { fetchImpl, now: () => clock.now, cache: createResponseCache({ now: () => clock.now }) }
  return { clock, deps }
}

function input(path: string, opts: { method?: string; headers?: ProxyInput['headers']; body?: Uint8Array | null } = {}): ProxyInput {
  const url = new URL(path, 'http://localhost')
  const route = matchRoute(routes, url.pathname)
  if (!route) throw new Error(`no route for ${path}`)
  return {
    route,
    method: opts.method ?? 'GET',
    pathname: url.pathname,
    search: url.search,
    headers: opts.headers ?? {},
    readBody: async () => (opts.body === undefined ? new Uint8Array() : opts.body),
  }
}

describe('upstreamUrl', () => {
  it('maps prefix, upstreamPath and query onto the route target', () => {
    expect(upstreamUrl(routes.find((r) => r.prefix === '/api/kandrive')!, '/api/kandrive/x', '')).toBe(
      'https://www.kandrive.gov/api/x',
    )
    const nws = routes.find((r) => r.prefix === '/api/nws')!
    expect(upstreamUrl(nws, '/api/nws/alerts/active', '?area=GA')).toBe('https://api.weather.gov/alerts/active?area=GA')
    expect(upstreamUrl(nws, '/api/nws', '')).toBe('https://api.weather.gov/')
  })

  it('keeps the origin for path tricks that try to change host', () => {
    const nws = routes.find((r) => r.prefix === '/api/nws')!
    for (const p of ['/api/nws//evil.example/x', '/api/nws/..%2f..%2fevil', '/api/nws/@evil.example', '/api/nws/\\evil.example']) {
      const out = upstreamUrl(nws, p, '')
      expect(out === null || new URL(out).origin === 'https://api.weather.gov').toBe(true)
    }
  })

  it('refuses a path that would turn the target into userinfo (the origin assertion)', () => {
    const nws = routes.find((r) => r.prefix === '/api/nws')!
    // Without the origin check these become https://evil.example/x ("api.weather.gov" parsed as a username).
    expect(upstreamUrl(nws, '/api/nws@evil.example/x', '')).toBeNull()
    expect(upstreamUrl(nws, '/api/nws:80@evil.example/x', '')).toBeNull()
  })
})

describe('handleProxy', () => {
  it('sends the NWS User-Agent from the route, and the repo default elsewhere', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    await handleProxy(input('/api/nws/alerts'), deps)
    await handleProxy(input('/api/txdot/x'), deps)
    expect(seen[0].init.headers).toMatchObject({ 'user-agent': 'INFLOW (ops@example.test)' })
    expect(seen[1].init.headers).toMatchObject({ 'user-agent': `INFLOW (${REPO_URL})` })
  })

  it('forwards only allowlisted request headers', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    await handleProxy(
      input('/api/txdot/x', {
        headers: {
          accept: 'application/json',
          'accept-language': 'en',
          cookie: 'sid=secret',
          authorization: 'Bearer x',
          host: 'evil.example',
          origin: 'https://evil.example',
          referer: 'https://evil.example/',
          'x-forwarded-for': '10.0.0.1',
          'content-type': 'text/plain',
        },
      }),
      deps,
    )
    const headers = seen[0].init.headers as Record<string, string>
    expect(Object.keys(headers).sort()).toEqual(['accept', 'accept-language', 'user-agent'])
  })

  it('forwards conditional headers on a GET', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    await handleProxy(input('/api/txdot/x', { headers: { 'if-none-match': '"abc"' } }), deps)
    expect(seen[0].init.headers).toMatchObject({ 'if-none-match': '"abc"' })
  })

  it('caches a GET within cacheSeconds and refetches after', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { clock, deps } = harness(fetchImpl)
    await handleProxy(input('/api/txdot/x'), deps)
    clock.now += 59_000
    const hit = await handleProxy(input('/api/txdot/x'), deps)
    expect(seen).toHaveLength(1)
    expect(new TextDecoder().decode(hit.body)).toBe('{"ok":true}')
    clock.now += 2_000
    await handleProxy(input('/api/txdot/x'), deps)
    expect(seen).toHaveLength(2)
  })

  it('does not cache non-200 responses', async () => {
    const { seen, fetchImpl } = fakeUpstream(() => new Response('nope', { status: 500 }))
    const { deps } = harness(fetchImpl)
    const first = await handleProxy(input('/api/txdot/x'), deps)
    await handleProxy(input('/api/txdot/x'), deps)
    expect(first.status).toBe(500)
    expect(seen).toHaveLength(2)
  })

  it('shares one upstream fetch between concurrent misses', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    const results = await Promise.all([1, 2, 3].map(() => handleProxy(input('/api/txdot/x'), deps)))
    expect(seen).toHaveLength(1)
    expect(results.map((r) => r.status)).toEqual([200, 200, 200])
  })

  it('bypasses the cache for conditional GETs and passes a 304 through', async () => {
    const { seen, fetchImpl } = fakeUpstream(() => new Response(null, { status: 304 }))
    const { deps } = harness(fetchImpl)
    const res = await handleProxy(input('/api/txdot/x', { headers: { 'if-none-match': '"abc"' } }), deps)
    expect(res.status).toBe(304)
    await handleProxy(input('/api/txdot/x'), deps)
    expect(seen).toHaveLength(2)
  })

  it('forwards the body and content-type of a CARS POST and never caches it', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    const body = new TextEncoder().encode('{"query":"{ cameras }"}')
    const headers = { 'content-type': 'application/json', accept: 'application/json' }
    await handleProxy(input('/api/kandrive/graphql', { method: 'POST', headers, body }), deps)
    await handleProxy(input('/api/kandrive/graphql', { method: 'POST', headers, body }), deps)
    expect(seen).toHaveLength(2)
    expect(seen[0].url).toBe('https://www.kandrive.gov/api/graphql')
    expect(seen[0].init.method).toBe('POST')
    expect(seen[0].init.body).toEqual(body)
    expect(seen[0].init.headers).toMatchObject({ 'content-type': 'application/json', accept: 'application/json' })
  })

  it('answers 413 for an oversized POST body without calling upstream', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    const res = await handleProxy({ ...input('/api/kandrive/graphql', { method: 'POST' }), readBody: async () => null }, deps)
    expect(res.status).toBe(413)
    expect(seen).toHaveLength(0)
  })

  it('answers 405 with Allow for a method the route does not allow', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    const post = await handleProxy(input('/api/nws/alerts', { method: 'POST' }), deps)
    const options = await handleProxy(input('/api/kandrive/x', { method: 'OPTIONS' }), deps)
    expect(post.status).toBe(405)
    expect(post.headers.allow).toBe('GET')
    expect(options.status).toBe(405)
    expect(options.headers.allow).toBe('GET, POST')
    expect(seen).toHaveLength(0)
  })

  it('passes a redirect back unchanged and never follows it', async () => {
    const { seen, fetchImpl } = fakeUpstream(
      () => new Response(null, { status: 302, headers: { location: 'https://m.youtube.com/watch?v=x' } }),
    )
    const { deps } = harness(fetchImpl)
    const res = await handleProxy(input('/api/youtube/watch?v=x'), deps)
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('https://m.youtube.com/watch?v=x')
    expect(seen).toHaveLength(1)
    expect(seen[0].init.redirect).toBe('manual')
  })

  it('drops set-cookie and other non-allowlisted response headers', async () => {
    const { fetchImpl } = fakeUpstream(() =>
      okJson({ 'set-cookie': 'sid=1', 'content-encoding': 'gzip', 'x-custom': 'y', etag: '"e"', 'cache-control': 'max-age=5' }),
    )
    const { deps } = harness(fetchImpl)
    const res = await handleProxy(input('/api/txdot/x'), deps)
    expect(res.headers).not.toHaveProperty('set-cookie')
    expect(res.headers).not.toHaveProperty('content-encoding')
    expect(res.headers).not.toHaveProperty('x-custom')
    expect(res.headers.etag).toBe('"e"')
    expect(res.headers['cache-control']).toBe('max-age=5')
  })

  it('marks upstream errors no-store, dropping the upstream cache headers (NWS 500s carry max-age=180)', async () => {
    const { fetchImpl } = fakeUpstream(
      () => new Response('oops', { status: 500, headers: { 'content-type': 'text/html', 'cache-control': 'max-age=180', etag: '"e"' } }),
    )
    const { deps } = harness(fetchImpl)
    const res = await handleProxy(input('/api/nws/alerts/active'), deps)
    expect(res.status).toBe(500)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers.etag).toBeUndefined()
  })

  it('answers 502 when the upstream throws', async () => {
    const { fetchImpl } = fakeUpstream(() => {
      throw new TypeError('fetch failed')
    })
    const { deps } = harness(fetchImpl)
    const res = await handleProxy(input('/api/txdot/x'), deps)
    expect(res.status).toBe(502)
  })

  it('sets a timeout signal on every upstream call', async () => {
    const { seen, fetchImpl } = fakeUpstream()
    const { deps } = harness(fetchImpl)
    await handleProxy(input('/api/txdot/x'), deps)
    expect(seen[0].init.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('readLimitedBody', () => {
  async function* chunks(...parts: string[]): AsyncGenerator<Uint8Array> {
    for (const p of parts) yield new TextEncoder().encode(p)
  }

  it('concatenates chunks under the limit', async () => {
    const out = await readLimitedBody(chunks('ab', 'cd'), 10)
    expect(new TextDecoder().decode(out ?? new Uint8Array())).toBe('abcd')
  })

  it('resolves null over the limit', async () => {
    expect(await readLimitedBody(chunks('abcd', 'efgh'), 6)).toBeNull()
  })
})
