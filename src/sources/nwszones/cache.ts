import type { ZoneShape } from './zones'

export const ZONE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const DB_NAME = 'storm-chasers'
const STORE = 'nws-zones'

export interface CachedZone {
  /** null caches a zone that answered but has no polygon, so it isn't re-requested every refresh. */
  shape: ZoneShape | null
  storedAt: number
}

/** Keyed by `<type>/<id>`. Failures are never fatal: a broken cache just means a refetch. */
export interface ZoneCache {
  get(key: string): Promise<CachedZone | undefined>
  put(key: string, entry: CachedZone): Promise<void>
}

export function createMemoryZoneCache(): ZoneCache {
  const map = new Map<string, CachedZone>()
  return {
    async get(key) {
      return map.get(key)
    },
    async put(key, entry) {
      map.set(key, entry)
    },
  }
}

function isCachedZone(v: unknown): v is CachedZone {
  return typeof v === 'object' && v !== null && 'shape' in v && 'storedAt' in v && typeof v.storedAt === 'number'
}

/** One readwrite/readonly request. Resolves on transaction complete; rejects on request error or abort. */
function run<T>(
  d: IDBDatabase,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = d.transaction(STORE, mode)
    let result: T | undefined
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB error'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
    const req = body(tx.objectStore(STORE))
    req.onsuccess = () => {
      result = req.result
    }
  })
}

/**
 * IndexedDB-backed cache. Any failure (open throws, open errors, a transaction aborts) degrades to an
 * in-memory Map for that call; no method rejects.
 */
export function createIdbZoneCache(idb: IDBFactory): ZoneCache {
  const fallback = createMemoryZoneCache()
  let db: Promise<IDBDatabase | null> | null = null

  // Never rejects: a synchronous throw or onerror resolves null, and the null is memoised for the session.
  function open(): Promise<IDBDatabase | null> {
    if (!db) {
      db = new Promise<IDBDatabase | null>((resolve) => {
        try {
          const req = idb.open(DB_NAME, 1)
          req.onupgradeneeded = () => {
            try {
              req.result.createObjectStore(STORE)
            } catch {
              // Store already exists; the open still succeeds.
            }
          }
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => resolve(null)
          // Another tab holds an older version open: don't wait on it, use memory for this session.
          req.onblocked = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
    }
    return db
  }

  return {
    async get(key) {
      try {
        const d = await open()
        if (!d) return fallback.get(key)
        const v: unknown = await run(d, 'readonly', (s) => s.get(key))
        return isCachedZone(v) ? v : undefined
      } catch {
        return fallback.get(key)
      }
    },
    async put(key, entry) {
      try {
        const d = await open()
        if (!d) return fallback.put(key, entry)
        await run(d, 'readwrite', (s) => s.put(entry, key))
      } catch {
        await fallback.put(key, entry)
      }
    },
  }
}

/** IndexedDB when the browser has it, otherwise memory. */
export function defaultZoneCache(): ZoneCache {
  return typeof indexedDB !== 'undefined' ? createIdbZoneCache(indexedDB) : createMemoryZoneCache()
}
