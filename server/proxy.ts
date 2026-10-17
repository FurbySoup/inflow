// `/api/*` proxy for the production server (WP-45, ADR-0005, ADR-0020). The upstream origin is fixed per route in
// proxy/routes.ts; the request can only choose the path and query under it. Headers and methods are allowlisted,
// redirects are passed back (never followed), and cookies are never forwarded or returned.
import type { IncomingHttpHeaders } from 'node:http'
import { REPO_URL, type ProxyRoute } from '../proxy/routes'
import type { CachedResponse, ResponseCache } from './cache'

export const UPSTREAM_TIMEOUT_MS = 15_000
export const MAX_REQUEST_BODY_BYTES = 64 * 1024

export const DEFAULT_USER_AGENT = `INFLOW storm-chasers (${REPO_URL})`

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface ProxyDeps {
  fetchImpl: FetchLike
  now: () => number
  cache: ResponseCache
}

export interface ProxyInput {
  route: ProxyRoute
  method: string
  pathname: string
  search: string
  headers: IncomingHttpHeaders
  /** Reads the request body, or resolves null when it is over MAX_REQUEST_BODY_BYTES. */
  readBody: () => Promise<Uint8Array | null>
}

const PASSED_REQUEST_HEADERS = ['accept', 'accept-language', 'if-none-match', 'if-modified-since'] as const
const PASSED_RESPONSE_HEADERS = ['content-type', 'cache-control', 'etag', 'last-modified', 'expires'] as const

/** The upstream URL for `pathname` under `route`, or null if it would leave the route's origin. */
export function upstreamUrl(route: ProxyRoute, pathname: string, search: string): string | null {
  const rest = pathname.slice(route.prefix.length)
  let url: URL
  try {
    url = new URL(route.target + route.upstreamPath + rest + search)
  } catch {
    return null
  }
  return url.origin === route.target ? url.href : null
}

export function upstreamRequestHeaders(
  route: ProxyRoute,
  incoming: IncomingHttpHeaders,
  method: string,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of PASSED_REQUEST_HEADERS) {
    const value = incoming[name]
    if (typeof value === 'string') out[name] = value
  }
  if (method === 'POST') {
    const contentType = incoming['content-type']
    if (typeof contentType === 'string') out['content-type'] = contentType
  }
  out['user-agent'] = DEFAULT_USER_AGENT
  for (const [name, value] of Object.entries(route.headers ?? {})) out[name.toLowerCase()] = value
  return out
}

function passedResponseHeaders(upstream: Response): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of PASSED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value !== null) out[name] = value
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get('location')
    if (location !== null) out.location = location
  }
  // Never let the browser cache an upstream error: NWS sends its 500 page with max-age=180, which kept the alerts
  // panel failing for 3 minutes after NWS had recovered (seen 2026-10-17).
  if (upstream.status >= 400) return noStore(out)
  return out
}

const VALIDATORS = new Set(['cache-control', 'expires', 'etag', 'last-modified'])

function noStore(headers: Record<string, string>): Record<string, string> {
  const out = Object.fromEntries(Object.entries(headers).filter(([name]) => !VALIDATORS.has(name)))
  return { ...out, 'cache-control': 'no-store' }
}

function textResponse(status: number, message: string, extra: Record<string, string> = {}): CachedResponse {
  return {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...extra },
    body: new TextEncoder().encode(message),
  }
}

async function callUpstream(
  deps: ProxyDeps,
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Uint8Array | undefined,
): Promise<CachedResponse> {
  const upstream = await deps.fetchImpl(url, {
    method,
    headers,
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  })
  return {
    status: upstream.status,
    headers: passedResponseHeaders(upstream),
    body: new Uint8Array(await upstream.arrayBuffer()),
  }
}

/** Answers one `/api/*` request. Never throws: upstream failures become 502. */
export async function handleProxy(input: ProxyInput, deps: ProxyDeps): Promise<CachedResponse> {
  const { route, method, pathname, search, headers } = input
  if (!route.methods.includes(method as ProxyRoute['methods'][number])) {
    return textResponse(405, 'Method not allowed', { allow: route.methods.join(', ') })
  }

  const url = upstreamUrl(route, pathname, search)
  if (url === null) return textResponse(400, 'Bad request')

  const conditional = headers['if-none-match'] !== undefined || headers['if-modified-since'] !== undefined
  try {
    if (method === 'POST') {
      const body = await input.readBody()
      if (body === null) return textResponse(413, 'Request body too large', { connection: 'close' })
      return await callUpstream(deps, url, method, upstreamRequestHeaders(route, headers, method), body)
    }
    // Conditional GETs bypass the cache: a 304 must not be shared with clients that did not send the condition.
    if (conditional || route.cacheSeconds <= 0) {
      return await callUpstream(deps, url, method, upstreamRequestHeaders(route, headers, method), undefined)
    }
    return await deps.cache.get(url, route.cacheSeconds, () =>
      callUpstream(deps, url, method, upstreamRequestHeaders(route, headers, method), undefined),
    )
  } catch {
    return textResponse(502, 'Upstream unavailable')
  }
}

/** Reads a request stream up to `limit` bytes; resolves null if it is longer. */
export async function readLimitedBody(stream: AsyncIterable<Uint8Array>, limit: number): Promise<Uint8Array | null> {
  const chunks: Uint8Array[] = []
  let total = 0
  for await (const chunk of stream) {
    total += chunk.byteLength
    if (total > limit) return null
    chunks.push(chunk)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}
