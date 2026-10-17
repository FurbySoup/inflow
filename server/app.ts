// Request handler for the production server (WP-45): `/healthz`, `/api/*` (proxy.ts) and the built app (static.ts).
// Every response, including errors, carries the security headers. No CSP yet (post-1.0).
import type { IncomingMessage, ServerResponse } from 'node:http'
import { matchRoute, type ProxyRoute } from '../proxy/routes'
import { createResponseCache, type CachedResponse } from './cache'
import { handleProxy, MAX_REQUEST_BODY_BYTES, readLimitedBody, type FetchLike } from './proxy'
import { readStaticFile } from './static'

export interface AppOptions {
  routes: readonly ProxyRoute[]
  distDir: string
  fetchImpl?: FetchLike
  now?: () => number
}

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
}

function text(status: number, message: string, extra: Record<string, string> = {}): CachedResponse {
  return {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...extra },
    body: new TextEncoder().encode(message),
  }
}

export function createApp({
  routes,
  distDir,
  fetchImpl = fetch,
  now = Date.now,
}: AppOptions): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const deps = { fetchImpl, now, cache: createResponseCache({ now }) }

  async function answer(req: IncomingMessage): Promise<CachedResponse> {
    const raw = req.url ?? ''
    // Origin-form only. `//host/...` would parse as a different host, so it is refused too.
    if (!raw.startsWith('/') || raw.startsWith('//')) return text(400, 'Bad request')

    const { pathname, search } = new URL(raw, 'http://localhost')
    const method = req.method ?? 'GET'

    if (pathname === '/healthz') {
      if (method !== 'GET' && method !== 'HEAD') return text(405, 'Method not allowed', { allow: 'GET, HEAD' })
      return text(200, 'ok')
    }

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const route = matchRoute(routes, pathname)
      if (!route) return text(404, 'Not found')
      return handleProxy(
        {
          route,
          method,
          pathname,
          search,
          headers: req.headers,
          readBody: () => readLimitedBody(req, MAX_REQUEST_BODY_BYTES),
        },
        deps,
      )
    }

    if (method !== 'GET' && method !== 'HEAD') return text(405, 'Method not allowed', { allow: 'GET, HEAD' })
    return (await readStaticFile(distDir, pathname)) ?? text(404, 'Not found')
  }

  return async (req, res) => {
    let result: CachedResponse
    try {
      result = await answer(req)
    } catch {
      result = text(500, 'Internal server error')
    }

    const headers: Record<string, string> = { ...SECURITY_HEADERS, ...result.headers }
    if (!('content-length' in headers)) headers['content-length'] = String(result.body.byteLength)
    res.writeHead(result.status, headers)
    if (req.method === 'HEAD') res.end()
    else res.end(result.body)
  }
}
