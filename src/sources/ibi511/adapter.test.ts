import { afterEach, describe, expect, it, vi } from 'vitest'
import ga from './fixtures/list-ga.json'
import fl from './fixtures/list-fl.json'
import { floridaCameras, georgiaCameras, ibi511Adapter, parseWkt, type Ibi511ListResponse, type Ibi511Record } from './adapter'

const gaList = ga as Ibi511ListResponse
const flList = fl as Ibi511ListResponse
const ATLANTA = { west: -84.5, south: 33.6, east: -84.2, north: 33.9 }

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
})

describe('ibi511 fetch and walk', () => {
  it('walks pages until recordsTotal and makes no request past it', async () => {
    const all = Array.from({ length: 250 }, (_, i) => record(i + 1, -84.4, 33.7))
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => listPage(String(input), 250, all))
    const adapter = ibi511Adapter({ id: 't', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
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
    const adapter = ibi511Adapter({ id: 't2', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
    await adapter.fetch(ATLANTA)
    vi.setSystemTime(new Date('2026-10-11T11:59:00Z'))
    await adapter.fetch(ATLANTA)
    expect(spy).toHaveBeenCalledTimes(1)
    vi.setSystemTime(new Date('2026-10-11T12:01:00Z'))
    await adapter.fetch(ATLANTA)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed walk', async () => {
    const all = [record(1, -84.4, 33.7)]
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 503 }))
      .mockImplementation(async (input) => listPage(String(input), 1, all))
    const adapter = ibi511Adapter({ id: 't3', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/503/)
    const raw = await adapter.fetch(ATLANTA)
    expect(raw.records).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not cache a 200 with a non-JSON body', async () => {
    const all = [record(1, -84.4, 33.7)]
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('<html>', { status: 200 }))
      .mockImplementation(async (input) => listPage(String(input), 1, all))
    const adapter = ibi511Adapter({ id: 't5', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow()
    const raw = await adapter.fetch(ATLANTA)
    expect(raw.records).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('treats a short page as a failed walk and does not cache it', async () => {
    const all = Array.from({ length: 150 }, (_, i) => record(i + 1, -84.4, 33.7))
    // The second page returns 10 rows where 50 are expected.
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const start = JSON.parse(new URL(String(input), 'http://localhost').searchParams.get('query') ?? '{}').start as number
      if (start === 100) return new Response(JSON.stringify({ recordsTotal: 150, data: all.slice(100, 110) }), { status: 200 })
      return listPage(String(input), 150, all)
    })
    const adapter = ibi511Adapter({ id: 't6', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
    await expect(adapter.fetch(ATLANTA)).rejects.toThrow(/expected 50/)
    spy.mockClear()
    spy.mockImplementation(async (input) => listPage(String(input), 150, all))
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
    const adapter = ibi511Adapter({ id: 't7', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
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
    const adapter = ibi511Adapter({ id: 't8', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
    const pending = adapter.fetch(ATLANTA)
    const assertion = expect(pending).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(30_000)
    await assertion
  })

  it('honours the caller signal', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {}))
    const adapter = ibi511Adapter({ id: 't4', state: 'GA', proxy: '/api/t', host: 'https://t.example', idPrefix: 't:' })
    const ctrl = new AbortController()
    const pending = adapter.fetch(ATLANTA, ctrl.signal)
    ctrl.abort()
    await expect(pending).rejects.toBeTruthy()
  })
})
