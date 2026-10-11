import { afterEach, describe, expect, it, vi } from 'vitest'
import ga from './fixtures/list-ga.json'
import fl from './fixtures/list-fl.json'
import pa from './fixtures/list-pa.json'
import ne from './fixtures/list-newengland.json'
import {
  floridaCameras,
  georgiaCameras,
  ibi511Adapter,
  ibi511Sites,
  newEnglandCameras,
  parseWkt,
  pennsylvaniaCameras,
  type Ibi511ListResponse,
  type Ibi511Record,
  type Ibi511Site,
} from './adapter'

const gaList = ga as Ibi511ListResponse
const flList = fl as Ibi511ListResponse
const paList = pa as Ibi511ListResponse
const neList = ne as Ibi511ListResponse
const ATLANTA = { west: -84.5, south: 33.6, east: -84.2, north: 33.9 }
const WORLD = { west: -180, south: -90, east: 180, north: 90 }
const MIN = 60_000
const TTL = 12 * 60 * MIN
const T0 = Date.parse('2026-10-11T00:00:00Z')
const PAST_BACKOFF = new Date(T0 + MIN)

function testSite(id: string): Ibi511Site {
  return { id, states: ['GA'], proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' }
}

function listPage(url: string, total: number, all: Ibi511Record[]): Response {
  const q = JSON.parse(new URL(url, 'http://localhost').searchParams.get('query') ?? '{}') as { start: number; length: number }
  const data = all.slice(q.start, q.start + q.length)
  return new Response(JSON.stringify({ recordsTotal: total, data }), { status: 200 })
}

function record(id: number, lng: number, lat: number): Ibi511Record {
  return {
    id,
    location: `cam ${id}`,
    latLng: { geography: { wellKnownText: `POINT (${lng} ${lat})` } },
    images: [{ id, imageUrl: `/map/Cctv/${id}`, disabled: false, blocked: false }],
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('parseWkt', () => {
  it('parses lon-lat WKT, including long decimals', () => {
    expect(parseWkt('POINT (-84.91445 34.37697)')).toEqual([-84.91445, 34.37697])
    expect(parseWkt('POINT (-84.372085571289 33.760177612305)')).toEqual([-84.372085571289, 33.760177612305])
  })

  it('rejects non-point, malformed and null-island values', () => {
    expect(parseWkt('LINESTRING (0 0, 1 1)')).toBeNull()
    expect(parseWkt('POINT EMPTY')).toBeNull()
    expect(parseWkt('POINT (NaN 3)')).toBeNull()
    expect(parseWkt('POINT (0 0)')).toBeNull()
    expect(parseWkt('')).toBeNull()
    expect(parseWkt(undefined)).toBeNull()
  })
})

describe('ibi511 normalize', () => {
  it('maps GA records to CameraFeed with prefixed ids, absolute snapshot URLs and no stream', () => {
    const cams = georgiaCameras.normalize({ aoi: ATLANTA, records: gaList.data })
    const lenox = cams.find((c) => c.id === '511ga:11148')
    expect(lenox).toEqual({
      id: '511ga:11148',
      title: 'ATL-0602: SR 13 at Lenox Rd / Cheshire Bridge Rd (Atlanta)',
      location: [-84.35284, 33.8258],
      snapshotUrl: 'https://511ga.org/map/Cctv/18558',
      streamUrl: null,
      state: 'GA',
    })
  })

  it('drops disabled and blocked first images', () => {
    // SYNTHETIC: 11227 is hand-set to disabled in the fixture. The upstream had no disabled image at capture time.
    const cams = georgiaCameras.normalize({ aoi: ATLANTA, records: gaList.data })
    expect(cams.map((c) => c.id)).not.toContain('511ga:11227')
    const blocked = [{ ...record(1, -84.4, 33.7), images: [{ id: 1, imageUrl: '/map/Cctv/1', disabled: false, blocked: true }] }]
    expect(georgiaCameras.normalize({ aoi: ATLANTA, records: blocked })).toEqual([])
  })

  it('drops records with no images or an empty image URL', () => {
    const none = { ...record(2, -84.4, 33.7), images: [] }
    const empty = { ...record(3, -84.4, 33.7), images: [{ id: 3, imageUrl: '', disabled: false, blocked: false }] }
    expect(georgiaCameras.normalize({ aoi: ATLANTA, records: [none, empty] })).toEqual([])
  })

  it('keeps only records inside the bbox (edges inclusive)', () => {
    const inside = record(10, -84.4, 33.7)
    const edge = record(11, -84.5, 33.9)
    const outside = record(12, -85.0, 33.7)
    const cams = georgiaCameras.normalize({ aoi: ATLANTA, records: [inside, edge, outside] })
    expect(cams.map((c) => c.id)).toEqual(['511ga:10', '511ga:11'])
  })

  it('skips records whose WKT does not parse', () => {
    const bad = { ...record(20, -84.4, 33.7), latLng: { geography: { wellKnownText: 'POINT EMPTY' } } }
    expect(georgiaCameras.normalize({ aoi: ATLANTA, records: [bad] })).toEqual([])
  })

  it('maps Florida records with the fl511 prefix and host', () => {
    const florida = { west: -82, south: 26, east: -80, north: 29 }
    const cams = floridaCameras.normalize({ aoi: florida, records: flList.data })
    expect(cams).toHaveLength(3)
    expect(cams.map((c) => c.id)).toEqual(['fl511:675', 'fl511:677', 'fl511:1'])
    // SYNTHETIC: fixture record 9999 is hand-set to disabled, so the FL disabled path is skipped.
    expect(cams.map((c) => c.id)).not.toContain('fl511:9999')
    expect(cams.every((c) => c.id.startsWith('fl511:') && c.state === 'FL')).toBe(true)
    expect(cams[0].snapshotUrl).toBe('https://fl511.com/map/Cctv/675')
  })

  it('normalizes the PA fixture with the pa511 prefix, host and state', () => {
    const pennsylvania = { west: -81, south: 39.5, east: -74.5, north: 42.5 }
    const cams = pennsylvaniaCameras.normalize({ aoi: pennsylvania, records: paList.data })
    expect(cams.map((c) => c.id)).toEqual(['pa511:1', 'pa511:2', 'pa511:3', 'pa511:4'])
    expect(cams[1]).toEqual({
      id: 'pa511:2',
      title: ' I-376 W/B @ Exit 10A Churchill Allegheny Co.',
      location: [-79.827031, 40.442056],
      snapshotUrl: 'https://www.511pa.com/map/Cctv/4692',
      streamUrl: null,
      state: 'PA',
    })
    expect(cams.every((c) => c.state === 'PA' && c.streamUrl === null)).toBe(true)
  })

  it('gives New England cameras VT, NH or ME from stateAt, falling back to VT offshore', () => {
    const wide = { west: -75, south: 41, east: -69, north: 46 }
    const portlandMe = record(901, -70.26, 43.66)
    const offshore = record(900, -69.5, 43.0)
    const cams = newEnglandCameras.normalize({ aoi: wide, records: [...neList.data, portlandMe, offshore] })
    const stateOf = Object.fromEntries(cams.map((c) => [c.id, c.state]))
    expect(stateOf).toEqual({
      'newengland511:1': 'VT',
      'newengland511:178': 'VT',
      'newengland511:220': 'NH',
      'newengland511:901': 'ME',
      'newengland511:900': 'VT',
    })
  })

  it('takes a New England state from areaId when it disagrees with stateAt', () => {
    // Portland ME is inside Maine, but the record says VT: areaId wins.
    const wide = { west: -75, south: 41, east: -69, north: 46 }
    const disagree = { ...record(902, -70.26, 43.66), areaId: 'VT' }
    expect(newEnglandCameras.normalize({ aoi: wide, records: [disagree] })[0].state).toBe('VT')
  })

  it('falls back to stateAt when areaId is missing or not one of the site states', () => {
    const wide = { west: -75, south: 41, east: -69, north: 46 }
    const missing = record(903, -70.26, 43.66)
    const unexpected = { ...record(904, -70.26, 43.66), areaId: 'MA' }
    const cams = newEnglandCameras.normalize({ aoi: wide, records: [missing, unexpected] })
    expect(cams.map((c) => c.state)).toEqual(['ME', 'ME'])
  })
})

describe('ibi511 site config', () => {
  // Proxy, host and states as verified by curl on 2026-10-11 (WP-29).
  const EXPECTED: [string, string, string, string, string[]][] = [
    ['ga511-cameras', '511ga:', '/api/511ga', 'https://511ga.org', ['GA']],
    ['fl511-cameras', 'fl511:', '/api/fl511', 'https://fl511.com', ['FL']],
    ['az511-cameras', 'az511:', '/api/az511', 'https://az511.gov', ['AZ']],
    ['id511-cameras', 'id511:', '/api/511id', 'https://511.idaho.gov', ['ID']],
    ['ak511-cameras', 'ak511:', '/api/511ak', 'https://511.alaska.gov', ['AK']],
    ['la511-cameras', 'la511:', '/api/511la', 'https://511la.org', ['LA']],
    ['ctroads-cameras', 'ctroads:', '/api/ctroads', 'https://ctroads.org', ['CT']],
    ['nvroads-cameras', 'nvroads:', '/api/nvroads', 'https://www.nvroads.com', ['NV']],
    ['pa511-cameras', 'pa511:', '/api/511pa', 'https://www.511pa.com', ['PA']],
    ['newengland511-cameras', 'newengland511:', '/api/newengland511', 'https://newengland511.org', ['VT', 'NH', 'ME']],
  ]

  it.each(EXPECTED)('%s has the verified prefix, proxy, host and states', (id, idPrefix, proxy, host, states) => {
    expect(ibi511Sites.find((s) => s.id === id)).toMatchObject({ idPrefix, proxy, host, states })
  })

  it('has unique adapter ids and id prefixes', () => {
    expect(new Set(ibi511Sites.map((s) => s.id)).size).toBe(ibi511Sites.length)
    expect(new Set(ibi511Sites.map((s) => s.idPrefix)).size).toBe(ibi511Sites.length)
  })

  it.each(ibi511Sites.map((s) => [s.id, s] as const))('%s walks its own proxy and tags cameras with its host and states', async (_id, site) => {
    const burlington = record(7, -73.21, 44.48)
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => listPage(String(input), 1, [burlington]))
    const adapter = ibi511Adapter(site)
    const cams = adapter.normalize(await adapter.fetch(WORLD))
    expect(String(spy.mock.calls[0][0]).startsWith(`${site.proxy}/List/GetData/Cameras?`)).toBe(true)
    expect(cams).toHaveLength(1)
    expect(cams[0].id).toBe(`${site.idPrefix}7`)
    expect(cams[0].snapshotUrl).toBe(`${site.host}/map/Cctv/7`)
    expect(site.states).toContain(cams[0].state)
  })
})

describe('ibi511 fetch and walk', () => {
  it('walks pages until recordsTotal and makes no request past it', async () => {
    const all = Array.from({ length: 250 }, (_, i) => record(i + 1, -84.4, 33.7))
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => listPage(String(input), 250, all))
    const adapter = ibi511Adapter(testSite('t'))
    const raw = await adapter.fetch(ATLANTA)
    expect(raw.records).toHaveLength(250)
    expect(spy).toHaveBeenCalledTimes(3)
    const starts = spy.mock.calls.map(([url]) => JSON.parse(new URL(String(url), 'http://localhost').searchParams.get('query') ?? '{}').start)
    expect(starts.sort((a, b) => a - b)).toEqual([0, 100, 200])
  })

  it('serves a second fetch within 12 h from memory, then walks again after 12 h', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T00:00:00Z'))
    const all = [record(1, -84.4, 33.7)]
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => listPage(String(input), 1, all))
    const adapter = ibi511Adapter(testSite('t2'))
    await adapter.fetch(ATLANTA)
    vi.setSystemTime(new Date('2026-10-11T11:59:00Z'))
    await adapter.fetch(ATLANTA)
    expect(spy).toHaveBeenCalledTimes(1)
    vi.setSystemTime(new Date('2026-10-11T12:01:00Z'))
    await adapter.fetch(ATLANTA)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed walk', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    const all = [record(1, -84.4, 33.7)]
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 503 }))
      .mockImplementation(async (input) => listPage(String(input), 1, all))
    const adapter = ibi511Adapter(testSite('t3'))
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    vi.setSystemTime(PAST_BACKOFF)
    const raw = await adapter.fetch(ATLANTA)
    expect(raw.records).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not cache a 200 with a non-JSON body', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    const all = [record(1, -84.4, 33.7)]
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('<html>', { status: 200 }))
      .mockImplementation(async (input) => listPage(String(input), 1, all))
    const adapter = ibi511Adapter(testSite('t5'))
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow()
    vi.setSystemTime(PAST_BACKOFF)
    const raw = await adapter.fetch(ATLANTA)
    expect(raw.records).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('treats a short page as a failed walk and does not cache it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    const all = Array.from({ length: 150 }, (_, i) => record(i + 1, -84.4, 33.7))
    // The second page returns 10 rows where 50 are expected.
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const start = JSON.parse(new URL(String(input), 'http://localhost').searchParams.get('query') ?? '{}').start as number
      if (start === 100) return new Response(JSON.stringify({ recordsTotal: 150, data: all.slice(100, 110) }), { status: 200 })
      return listPage(String(input), 150, all)
    })
    const adapter = ibi511Adapter(testSite('t6'))
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/expected 50/)
    spy.mockClear()
    spy.mockImplementation(async (input) => listPage(String(input), 150, all))
    vi.setSystemTime(PAST_BACKOFF)
    const raw = await adapter.fetch(ATLANTA)
    expect(raw.records).toHaveLength(150)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('stops starting new pages after one page fails', async () => {
    const all = Array.from({ length: 1000 }, (_, i) => record(i + 1, -84.4, 33.7))
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const start = JSON.parse(new URL(String(input), 'http://localhost').searchParams.get('query') ?? '{}').start as number
      if (start === 100) return new Response('boom', { status: 500 })
      return listPage(String(input), 1000, all)
    })
    const adapter = ibi511Adapter(testSite('t7'))
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/500/)
    // Page 0 plus at most the pages already in flight (CONCURRENCY 4); pages 500..900 are never requested.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(5)
  })

  it('fails a hung page after the timeout instead of pinning the walk', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    // A connection that never answers, but rejects when its signal aborts, as real fetch does.
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    )
    const adapter = ibi511Adapter(testSite('t8'))
    const pending = adapter.fetch(ATLANTA)
    const assertion = expect(pending).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(30_000)
    await assertion
  })

  it('honours the caller signal', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {}))
    const adapter = ibi511Adapter(testSite('t4'))
    const ctrl = new AbortController()
    const pending = adapter.fetch(ATLANTA, ctrl.signal)
    ctrl.abort()
    await expect(pending).rejects.toBeTruthy()
  })
})

describe('ibi511 walk back-off', () => {
  // Every walk here is a single page-0 request that fails with 503 until setFailing(false).
  function failingUntilReset(all: Ibi511Record[]) {
    let failing = true
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      failing ? new Response('nope', { status: 503 }) : listPage(String(input), 1, all),
    )
    return { spy, setFailing: (v: boolean) => (failing = v) }
  }

  it('fails fast inside the 1 min window with no network call, then walks again after it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    const { spy, setFailing } = failingUntilReset([record(1, -84.4, 33.7)])
    const adapter = ibi511Adapter(testSite('b1'))
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    vi.setSystemTime(T0 + MIN - 1)
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    expect(spy).toHaveBeenCalledTimes(1)
    vi.setSystemTime(T0 + MIN)
    setFailing(false)
    const raw = await adapter.fetch(ATLANTA)
    expect(raw.records).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('doubles the window per failure (1, 2, 4, 8, 16 min) and caps it at 30 min', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    const { spy } = failingUntilReset([record(1, -84.4, 33.7)])
    const adapter = ibi511Adapter(testSite('b2'))
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    let calls = 1
    let t = T0
    for (const minutes of [1, 2, 4, 8, 16, 30, 30]) {
      vi.setSystemTime(t + minutes * MIN - 1)
      await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
      expect(spy).toHaveBeenCalledTimes(calls)
      t += minutes * MIN
      vi.setSystemTime(t)
      await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
      calls += 1
      expect(spy).toHaveBeenCalledTimes(calls)
    }
  })

  it('resets to the 1 min window after a success', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    const { spy, setFailing } = failingUntilReset([record(1, -84.4, 33.7)])
    const adapter = ibi511Adapter(testSite('b3'))
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    vi.setSystemTime(T0 + MIN)
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    // Second failure set a 2 min window; it ends at T0 + 3 min, where the walk succeeds.
    vi.setSystemTime(T0 + 3 * MIN)
    setFailing(false)
    expect((await adapter.fetch(ATLANTA)).records).toHaveLength(1)
    // Let the cached walk expire, then fail once more: the window must be back to 1 min, not 4.
    const failAt = T0 + 3 * MIN + TTL + 1
    setFailing(true)
    vi.setSystemTime(failAt)
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    const callsAfterFail = spy.mock.calls.length
    vi.setSystemTime(failAt + MIN - 1)
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    expect(spy).toHaveBeenCalledTimes(callsAfterFail)
    vi.setSystemTime(failAt + MIN)
    setFailing(false)
    expect((await adapter.fetch(ATLANTA)).records).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(callsAfterFail + 1)
  })
})
