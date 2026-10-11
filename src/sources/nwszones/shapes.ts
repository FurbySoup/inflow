import { defaultZoneCache, ZONE_TTL_MS, type ZoneCache } from './cache'
import { normalizeZone, zoneKeyFromUrl, zoneUrlToProxy, type NwsZoneResponse, type ZoneShape } from './zones'

const CONCURRENCY = 4
const RETRY_AFTER_429_MS = 5_000
const MAX_429_RETRIES = 2

export interface ZoneShapeDeps {
  cache?: ZoneCache
  /** Injected in tests; defaults to a same-origin GET against the NWS proxy. */
  fetchZone?: (url: string, signal?: AbortSignal) => Promise<Response>
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

let sharedCache: ZoneCache | null = null

const defaultFetch = (url: string, signal?: AbortSignal) =>
  fetch(zoneUrlToProxy(url), { signal, headers: { Accept: 'application/geo+json' } })

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Fetches one zone, backing off on 429. Returns null on any failure so the zone is skipped. */
async function fetchOne(url: string, deps: Required<Omit<ZoneShapeDeps, 'cache'>>, signal?: AbortSignal): Promise<ZoneShape | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await deps.fetchZone(url, signal)
      if (res.status === 429 && attempt < MAX_429_RETRIES) {
        await deps.sleep(RETRY_AFTER_429_MS)
        continue
      }
      if (!res.ok) return null
      const raw = (await res.json()) as NwsZoneResponse
      return normalizeZone(raw)
    } catch {
      return null
    }
  }
}

/**
 * Resolves zone URLs to shapes, keyed by `<type>/<id>` (see zoneKeyFromUrl). Cached shapes (30-day TTL)
 * skip the network; misses are fetched with concurrency ≤ 4. A zone that fails is left out of the result.
 */
export async function getZoneShapes(urls: string[], signal?: AbortSignal, deps: ZoneShapeDeps = {}): Promise<Map<string, ZoneShape>> {
  sharedCache ??= defaultZoneCache()
  const cache = deps.cache ?? sharedCache
  const resolved = {
    fetchZone: deps.fetchZone ?? defaultFetch,
    sleep: deps.sleep ?? defaultSleep,
    now: deps.now ?? (() => Date.now()),
  }
  const out = new Map<string, ZoneShape>()
  const keys = new Map<string, string>()
  for (const url of urls) keys.set(zoneKeyFromUrl(url), url)

  const misses: [string, string][] = []
  await Promise.all(
    [...keys].map(async ([key, url]) => {
      const hit = await cache.get(key)
      if (hit && resolved.now() - hit.storedAt < ZONE_TTL_MS) out.set(key, hit.shape)
      else misses.push([key, url])
    }),
  )

  let next = 0
  const worker = async () => {
    while (next < misses.length && !signal?.aborted) {
      const [key, url] = misses[next++]
      const shape = await fetchOne(url, resolved, signal)
      if (shape) {
        out.set(key, shape)
        await cache.put(key, { shape, storedAt: resolved.now() })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, misses.length) }, worker))

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return out
}
