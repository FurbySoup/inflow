import type { ZoneShape } from './zones'

export const ZONE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const DB_NAME = 'storm-chasers'
const STORE = 'nws-zones'

export interface CachedZone {
  shape: ZoneShape
  storedAt: number
}

/** Keyed by zone id. Failures are never fatal: a broken cache just means a refetch. */
export interface ZoneCache {
  get(id: string): Promise<CachedZone | undefined>
  put(id: string, entry: CachedZone): Promise<void>
}

export function createMemoryZoneCache(): ZoneCache {
  const map = new Map<string, CachedZone>()
  return {
    async get(id) {
      return map.get(id)
    },
    async put(id, entry) {
      map.set(id, entry)
    },
  }
}

function isCachedZone(v: unknown): v is CachedZone {
  return typeof v === 'object' && v !== null && 'shape' in v && 'storedAt' in v && typeof v.storedAt === 'number'
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** IndexedDB-backed cache. If the database can't open, every call falls back to an in-memory Map. */
export function createIdbZoneCache(idb: IDBFactory): ZoneCache {
  const fallback = createMemoryZoneCache()
  let db: Promise<IDBDatabase | null> | null = null

  function open(): Promise<IDBDatabase | null> {
    if (!db) {
      db = new Promise<IDBDatabase | null>((resolve) => {
        const req = idb.open(DB_NAME, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(STORE)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      })
    }
    return db
  }

  return {
    async get(id) {
      const d = await open()
      if (!d) return fallback.get(id)
      try {
        const v: unknown = await request(d.transaction(STORE, 'readonly').objectStore(STORE).get(id))
        return isCachedZone(v) ? v : undefined
      } catch {
        return fallback.get(id)
      }
    },
    async put(id, entry) {
      const d = await open()
      if (!d) return fallback.put(id, entry)
      try {
        await request(d.transaction(STORE, 'readwrite').objectStore(STORE).put(entry, id))
      } catch {
        await fallback.put(id, entry)
      }
    },
  }
}

/** IndexedDB when the browser has it, otherwise memory. */
export function defaultZoneCache(): ZoneCache {
  return typeof indexedDB !== 'undefined' ? createIdbZoneCache(indexedDB) : createMemoryZoneCache()
}
