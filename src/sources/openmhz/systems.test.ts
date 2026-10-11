import { afterEach, describe, expect, it, vi } from 'vitest'
import raw from './fixtures/systems.json'
import {
  coveredStates,
  normalizeSystems,
  openmhzSystemsAdapter,
  systemsInAoi,
  type OpenMhzSystemsResponse,
} from './systems'

// Fixture was taken 2026-10-11 ~19:00Z; the fetch time below is pinned so the 24 h window is deterministic.
const FETCHED_AT = Date.parse('2026-10-11T19:00:00Z')
const response = raw as OpenMhzSystemsResponse
// The list ignores the AOI; fetch only takes one for the SourceAdapter contract.
const AOI = { west: -85.6, south: 30.4, east: -78.5, north: 35.3 }

function listOf(...systems: OpenMhzSystemsResponse['systems']) {
  return { fetchedAt: FETCHED_AT, systems }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('normalizeSystems', () => {
  it('drops systems without a state and systems not heard for 24 h, sorted by state then name', () => {
    const systems = normalizeSystems({ fetchedAt: FETCHED_AT, systems: response.systems })
    // swbcmarine has no state; dartfd was last heard 2026-10-10 05:00Z, about 38 h before FETCHED_AT.
    expect(systems.map((s) => s.shortName)).toEqual(['atlps', 'camden', 'hltnps', 'aikenfire', 'palm800', 'yorksc'])
  })

  it('uses the city, else the county, else an empty place', () => {
    const systems = normalizeSystems({ fetchedAt: FETCHED_AT, systems: response.systems })
    const place = Object.fromEntries(systems.map((s) => [s.shortName, s.place]))
    expect(place).toEqual({ atlps: 'Atlanta', camden: 'Camden', hltnps: 'Hamilton', aikenfire: 'Aiken', palm800: 'Sumter', yorksc: 'York County' })
  })

  it('keeps a system heard just inside the 24 h window and drops one just outside it', () => {
    const base = response.systems[0]
    const edge = (shortName: string, ageMs: number) => ({
      ...base,
      shortName,
      state: 'GA',
      lastActive: new Date(FETCHED_AT - ageMs).toISOString(),
    })
    const systems = normalizeSystems(
      listOf(edge('inside', 24 * 60 * 60_000 - 1000), edge('outside', 24 * 60 * 60_000 + 1000)),
    )
    expect(systems.map((s) => s.shortName)).toEqual(['inside'])
  })
})

describe('systemsInAoi and coveredStates', () => {
  const systems = normalizeSystems({ fetchedAt: FETCHED_AT, systems: response.systems })

  it('returns the GA and SC systems for a GA/SC AOI', () => {
    expect(systemsInAoi(systems, ['GA', 'SC']).map((s) => s.shortName)).toEqual([
      'atlps',
      'camden',
      'aikenfire',
      'palm800',
      'yorksc',
    ])
  })

  it('returns nothing over an uncovered state, and lists the covered states', () => {
    expect(systemsInAoi(systems, ['FL'])).toEqual([])
    expect(coveredStates(systems)).toEqual(['GA', 'OH', 'SC'])
  })
})

describe('openmhzSystemsAdapter fetch cache', () => {
  function stubFetch(...responses: Array<{ ok: boolean; status: number; body?: unknown }>) {
    const mock = vi.fn(async () => {
      const next = responses.shift() ?? { ok: true, status: 200, body: response }
      return { ok: next.ok, status: next.status, json: async () => next.body }
    })
    vi.stubGlobal('fetch', mock)
    return mock
  }

  it('makes one request for 12 h, then fetches again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(FETCHED_AT)
    const mock = stubFetch()
    const adapter = openmhzSystemsAdapter()

    const first = await adapter.fetch(AOI)
    const second = await adapter.fetch(AOI)
    expect(mock).toHaveBeenCalledTimes(1)
    expect(first.fetchedAt).toBe(FETCHED_AT)
    expect(second).toBe(first)

    vi.setSystemTime(FETCHED_AT + 12 * 60 * 60_000 + 1)
    await adapter.fetch(AOI)
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed fetch', async () => {
    const mock = stubFetch({ ok: false, status: 503 }, { ok: true, status: 200, body: response })
    const adapter = openmhzSystemsAdapter()

    await expect(adapter.fetch(AOI)).rejects.toThrow('OpenMHz systems 503')
    const result = await adapter.fetch(AOI)
    expect(mock).toHaveBeenCalledTimes(2)
    expect(result.systems).toHaveLength(response.systems.length)
  })
})
