// In-memory cache for proxied GET responses (WP-45, ADR-0020). Keyed by the full upstream URL.
// Only 200 responses under 5 MB are stored, for the route's `cacheSeconds`. Concurrent misses for one key
// share a single upstream fetch. Oldest entries are evicted first once the cache holds 500 entries.

export const MAX_CACHE_ENTRIES = 500
export const MAX_CACHEABLE_BYTES = 5 * 1024 * 1024

export interface CachedResponse {
  status: number
  headers: Record<string, string>
  body: Uint8Array
}

export interface ResponseCache {
  /** Returns a fresh cached response, or runs `load` once (shared by concurrent callers) and stores it if cacheable. */
  get(key: string, ttlSeconds: number, load: () => Promise<CachedResponse>): Promise<CachedResponse>
}

interface Entry {
  value: CachedResponse
  expires: number
}

export function createResponseCache(opts: { now: () => number; maxEntries?: number }): ResponseCache {
  const maxEntries = opts.maxEntries ?? MAX_CACHE_ENTRIES
  // Map iteration order is insertion order, so the first key is the oldest.
  const store = new Map<string, Entry>()
  const inflight = new Map<string, Promise<CachedResponse>>()

  function remember(key: string, value: CachedResponse, ttlMs: number): void {
    store.delete(key)
    store.set(key, { value, expires: opts.now() + ttlMs })
    while (store.size > maxEntries) {
      const oldest = store.keys().next().value
      if (oldest === undefined) break
      store.delete(oldest)
    }
  }

  return {
    get(key, ttlSeconds, load) {
      const hit = store.get(key)
      if (hit) {
        if (hit.expires > opts.now()) return Promise.resolve(hit.value)
        store.delete(key)
      }
      const pending = inflight.get(key)
      if (pending) return pending

      const started = Promise.resolve()
        .then(load)
        .then((value) => {
          if (value.status === 200 && value.body.byteLength < MAX_CACHEABLE_BYTES && ttlSeconds > 0) {
            remember(key, value, ttlSeconds * 1000)
          }
          return value
        })
        .finally(() => {
          inflight.delete(key)
        })
      inflight.set(key, started)
      return started
    },
  }
}
