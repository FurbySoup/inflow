import { describe, expect, it, vi } from 'vitest'
import { createMemoryZoneCache, ZONE_TTL_MS } from './cache'
import { getZoneShapes } from './shapes'
import county from './fixtures/county-GAC033.json'

const A = 'https://api.weather.gov/zones/county/GAC033'
const B = 'https://api.weather.gov/zones/county/SCC009'
const C = 'https://api.weather.gov/zones/county/SCC011'

function okResponse(url: string): Response {
  const body = { ...county, id: url }
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

function status(code: number): Response {
  return { ok: code < 400, status: code, json: async () => ({}) } as unknown as Response
}

describe('getZoneShapes', () => {
  it('fetches misses through the proxy and keys results by zone id', async () => {
    const fetchZone = vi.fn(async (url: string) => okResponse(url))
    const shapes = await getZoneShapes([A], undefined, { cache: createMemoryZoneCache(), fetchZone })
    expect(shapes.get('county/GAC033')?.geometry.type).toBe('Polygon')
    expect(fetchZone).toHaveBeenCalledWith(A, undefined)
  })

  it('serves a cache hit without fetching', async () => {
    const cache = createMemoryZoneCache()
    const fetchZone = vi.fn(async (url: string) => okResponse(url))
    await getZoneShapes([A, B], undefined, { cache, fetchZone })
    expect(fetchZone).toHaveBeenCalledTimes(2)

    const again = await getZoneShapes([A, B], undefined, { cache, fetchZone })
    expect(fetchZone).toHaveBeenCalledTimes(2)
    expect(again.size).toBe(2)
  })

  it('refetches once the 30-day TTL has passed', async () => {
    const cache = createMemoryZoneCache()
    const fetchZone = vi.fn(async (url: string) => okResponse(url))
    await getZoneShapes([A], undefined, { cache, fetchZone, now: () => 0 })
    await getZoneShapes([A], undefined, { cache, fetchZone, now: () => ZONE_TTL_MS - 1 })
    expect(fetchZone).toHaveBeenCalledTimes(1)
    await getZoneShapes([A], undefined, { cache, fetchZone, now: () => ZONE_TTL_MS + 1 })
    expect(fetchZone).toHaveBeenCalledTimes(2)
  })

  it('skips a failed zone without failing the rest', async () => {
    const fetchZone = vi.fn(async (url: string) => (url === B ? status(500) : okResponse(url)))
    const shapes = await getZoneShapes([A, B, C], undefined, { cache: createMemoryZoneCache(), fetchZone })
    expect([...shapes.keys()].sort()).toEqual(['county/GAC033', 'county/SCC011'])
  })

  it('caches county/X and forecast/X separately', async () => {
    const cache = createMemoryZoneCache()
    const fetchZone = vi.fn(async (url: string) => okResponse(url))
    const forecastUrl = 'https://api.weather.gov/zones/forecast/GAC033'
    const shapes = await getZoneShapes([A, forecastUrl], undefined, { cache, fetchZone })
    expect([...shapes.keys()].sort()).toEqual(['county/GAC033', 'forecast/GAC033'])
    expect(fetchZone).toHaveBeenCalledTimes(2)
    await getZoneShapes([forecastUrl], undefined, { cache, fetchZone })
    expect(fetchZone).toHaveBeenCalledTimes(2)
  })

  it('skips a zone that throws a network error', async () => {
    const fetchZone = vi.fn(async (url: string) => {
      if (url === B) throw new TypeError('network down')
      return okResponse(url)
    })
    const shapes = await getZoneShapes([A, B], undefined, { cache: createMemoryZoneCache(), fetchZone })
    expect(shapes.has('county/SCC009')).toBe(false)
    expect(shapes.has('county/GAC033')).toBe(true)
  })

  it('backs off 5 s on 429 and retries', async () => {
    const sleep = vi.fn(async () => {})
    const fetchZone = vi.fn().mockResolvedValueOnce(status(429)).mockImplementationOnce(async () => okResponse(A))
    const shapes = await getZoneShapes([A], undefined, { cache: createMemoryZoneCache(), fetchZone, sleep })
    expect(sleep).toHaveBeenCalledWith(5_000)
    expect(fetchZone).toHaveBeenCalledTimes(2)
    expect(shapes.has('county/GAC033')).toBe(true)
  })

  it('gives up after repeated 429s and skips the zone', async () => {
    const sleep = vi.fn(async () => {})
    const fetchZone = vi.fn(async () => status(429))
    const shapes = await getZoneShapes([A], undefined, { cache: createMemoryZoneCache(), fetchZone, sleep })
    expect(shapes.size).toBe(0)
    expect(fetchZone).toHaveBeenCalledTimes(3)
  })
})
