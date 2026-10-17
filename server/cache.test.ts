// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MAX_CACHEABLE_BYTES, createResponseCache, type CachedResponse } from './cache'

function value(status = 200, size = 4): CachedResponse {
  return { status, headers: {}, body: new Uint8Array(size) }
}

function clock(start = 1_000_000) {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe('response cache', () => {
  it('serves a hit within ttl and misses after it', async () => {
    const c = clock()
    const cache = createResponseCache({ now: c.now })
    let loads = 0
    const load = async () => (loads++, value())

    await cache.get('u', 30, load)
    await cache.get('u', 30, load)
    expect(loads).toBe(1)

    c.advance(29_000)
    await cache.get('u', 30, load)
    expect(loads).toBe(1)

    c.advance(2_000)
    await cache.get('u', 30, load)
    expect(loads).toBe(2)
  })

  it('does not store non-200 responses', async () => {
    const cache = createResponseCache({ now: clock().now })
    let loads = 0
    const load = async () => (loads++, value(503))
    await cache.get('u', 30, load)
    await cache.get('u', 30, load)
    expect(loads).toBe(2)
  })

  it('does not store bodies at or above 5 MB', async () => {
    const cache = createResponseCache({ now: clock().now })
    let loads = 0
    const load = async () => (loads++, value(200, MAX_CACHEABLE_BYTES))
    await cache.get('u', 30, load)
    await cache.get('u', 30, load)
    expect(loads).toBe(2)
  })

  it('does not store when ttl is zero', async () => {
    const cache = createResponseCache({ now: clock().now })
    let loads = 0
    const load = async () => (loads++, value())
    await cache.get('u', 0, load)
    await cache.get('u', 0, load)
    expect(loads).toBe(2)
  })

  it('shares one load between concurrent misses', async () => {
    const cache = createResponseCache({ now: clock().now })
    let loads = 0
    let release: (v: CachedResponse) => void = () => {}
    const load = () => {
      loads++
      return new Promise<CachedResponse>((resolve) => (release = resolve))
    }
    const a = cache.get('u', 30, load)
    const b = cache.get('u', 30, load)
    await new Promise((r) => setTimeout(r, 0))
    release(value())
    const [ra, rb] = await Promise.all([a, b])
    expect(loads).toBe(1)
    expect(ra).toBe(rb)
  })

  it('shares a failure with concurrent callers and does not cache it', async () => {
    const cache = createResponseCache({ now: clock().now })
    let loads = 0
    const load = async () => {
      loads++
      throw new Error('network down')
    }
    const results = await Promise.allSettled([cache.get('u', 30, load), cache.get('u', 30, load)])
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected'])
    expect(loads).toBe(1)
    await expect(cache.get('u', 30, load)).rejects.toThrow('network down')
    expect(loads).toBe(2)
  })

  it('evicts the oldest entry once the cache is full', async () => {
    const cache = createResponseCache({ now: clock().now, maxEntries: 2 })
    let loads = 0
    const load = async () => (loads++, value())
    await cache.get('a', 30, load)
    await cache.get('b', 30, load)
    await cache.get('c', 30, load)
    expect(loads).toBe(3)
    await cache.get('b', 30, load)
    await cache.get('c', 30, load)
    expect(loads).toBe(3)
    await cache.get('a', 30, load)
    expect(loads).toBe(4)
  })
})
