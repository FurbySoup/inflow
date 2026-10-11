import { describe, expect, it } from 'vitest'
import { createIdbZoneCache, type CachedZone } from './cache'

type Mode = 'works' | 'open-throws' | 'open-error' | 'tx-aborts'

interface FakeTx {
  error: Error | null
  oncomplete: (() => void) | null
  onerror: (() => void) | null
  onabort: (() => void) | null
  objectStore(name: string): FakeStore
}

interface FakeStore {
  get(key: string): FakeReq
  put(value: unknown, key: string): FakeReq
}

interface FakeReq {
  result: unknown
  onsuccess: (() => void) | null
}

/** Hand-written IDBFactory: just enough surface for the cache. Events fire on a timer, as in a browser. */
function fakeIdb(mode: Mode): IDBFactory {
  const rows = new Map<string, unknown>()

  function schedule(tx: FakeTx, op: () => unknown): FakeReq {
    const req: FakeReq = { result: undefined, onsuccess: null }
    setTimeout(() => {
      if (mode === 'tx-aborts') {
        tx.error = new Error('AbortError')
        tx.onerror?.()
        tx.onabort?.()
        return
      }
      req.result = op()
      req.onsuccess?.()
      tx.oncomplete?.()
    }, 0)
    return req
  }

  function makeTx(): FakeTx {
    const tx: FakeTx = {
      error: null,
      oncomplete: null,
      onerror: null,
      onabort: null,
      objectStore: () => store,
    }
    const store: FakeStore = {
      get: (key) => schedule(tx, () => rows.get(key)),
      put: (value, key) =>
        schedule(tx, () => {
          rows.set(key, value)
          return key
        }),
    }
    return tx
  }

  const db = { createObjectStore: () => ({}), transaction: () => makeTx() }

  const factory = {
    open() {
      if (mode === 'open-throws') throw new Error('SecurityError: storage disabled')
      const req: { result: unknown; onsuccess: (() => void) | null; onerror: (() => void) | null; onupgradeneeded: (() => void) | null } = {
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      }
      setTimeout(() => {
        if (mode === 'open-error') {
          req.onerror?.()
          return
        }
        req.onupgradeneeded?.()
        req.onsuccess?.()
      }, 0)
      return req
    },
  }
  return factory as unknown as IDBFactory
}

const entry = (storedAt: number): CachedZone => ({
  shape: { key: 'county/GAC033', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } },
  storedAt,
})

describe('createIdbZoneCache', () => {
  it('round-trips an entry through IndexedDB when it works', async () => {
    const cache = createIdbZoneCache(fakeIdb('works'))
    await cache.put('county/GAC033', entry(1))
    await expect(cache.get('county/GAC033')).resolves.toEqual(entry(1))
    await expect(cache.get('county/SCC009')).resolves.toBeUndefined()
  })

  it('round-trips a negative (no polygon) entry', async () => {
    const cache = createIdbZoneCache(fakeIdb('works'))
    await cache.put('county/GAC001', { shape: null, storedAt: 7 })
    await expect(cache.get('county/GAC001')).resolves.toEqual({ shape: null, storedAt: 7 })
  })

  it('(a) when open() throws synchronously, get and put use memory and never reject', async () => {
    const cache = createIdbZoneCache(fakeIdb('open-throws'))
    await expect(cache.get('county/GAC033')).resolves.toBeUndefined()
    await expect(cache.put('county/GAC033', entry(1))).resolves.toBeUndefined()
    await expect(cache.get('county/GAC033')).resolves.toEqual(entry(1))
  })

  it('(b) when the open request errors, get and put use memory', async () => {
    const cache = createIdbZoneCache(fakeIdb('open-error'))
    await expect(cache.put('county/GAC033', entry(2))).resolves.toBeUndefined()
    await expect(cache.get('county/GAC033')).resolves.toEqual(entry(2))
  })

  it('(c) when a transaction aborts, get resolves as a miss and put does not throw', async () => {
    const cache = createIdbZoneCache(fakeIdb('tx-aborts'))
    await expect(cache.get('county/GAC033')).resolves.toBeUndefined()
    await expect(cache.put('county/GAC033', entry(3))).resolves.toBeUndefined()
    // The write that aborted in IndexedDB still lands in the memory fallback.
    await expect(cache.get('county/GAC033')).resolves.toEqual(entry(3))
  })
})
