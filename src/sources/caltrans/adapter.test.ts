import { afterEach, describe, expect, it, vi } from 'vitest'
import d9 from './fixtures/cctv-d9.json'
import { californiaCameras, districtUrl, districtsForBbox, type CaltransCctv, type CaltransRaw } from './adapter'

const rows = (d9 as { data: CaltransCctv[] }).data
const D9_AREA = { west: -119.6, south: 34.8, east: -117.7, north: 38.5 }
const LA = { west: -118.6, south: 33.7, east: -118.1, north: 34.2 }
const MAMMOTH = { west: -118.95, south: 37.6, east: -118.9, north: 37.7 }
const SEATTLE = { west: -122.5, south: 47.4, east: -122.2, north: 47.7 }
const CALIFORNIA = { west: -124.5, south: 32.5, east: -114.1, north: 42 }

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.resetModules()
})

async function freshAdapter() {
  vi.resetModules()
  const mod = await import('./adapter')
  return mod.californiaCameras
}

// A minimal camera row, overridable per test. Values are strings, as upstream sends them.
function row(index: string, overrides: Partial<{ lng: string; lat: string; url: string; inService: string; name: string }> = {}): CaltransCctv {
  return {
    cctv: {
      index,
      location: {
        locationName: overrides.name ?? `cam ${index}`,
        longitude: overrides.lng ?? '-118.4',
        latitude: overrides.lat ?? '34.0',
      },
      inService: overrides.inService ?? 'true',
      imageData: { static: { currentImageURL: overrides.url ?? `https://cwwp2.dot.ca.gov/data/d7/cctv/image/${index}.jpg` } },
    },
  }
}

describe('caltrans normalize', () => {
  it('maps in-service D9 cameras to CameraFeed and drops the out-of-service one', () => {
    const cams = californiaCameras.normalize({ aoi: D9_AREA, files: [{ district: 9, data: rows }] })
    expect(cams.map((c) => c.id)).toEqual(['caltrans:9-1', 'caltrans:9-33', 'caltrans:9-38'])
    expect(cams[0]).toEqual({
      id: 'caltrans:9-1',
      title: 'SR-203 : Mammoth Mountain',
      location: [-118.91848, 37.64111],
      snapshotUrl: 'https://cwwp2.dot.ca.gov/data/d9/cctv/image/sr203mammothmountain/sr203mammothmountain.jpg',
      streamUrl: null,
      state: 'CA',
    })
  })

  it('parses string coordinates and keeps only those inside the AOI', () => {
    const cams = californiaCameras.normalize({ aoi: LA, files: [{ district: 9, data: rows }] })
    expect(cams).toEqual([])
    const inside = californiaCameras.normalize({
      aoi: LA,
      files: [{ district: 7, data: [row('5', { lng: '-118.25', lat: '34.05' }), row('6', { lng: '-121.0', lat: '34.05' })] }],
    })
    expect(inside.map((c) => c.id)).toEqual(['caltrans:7-5'])
    expect(inside[0].location).toEqual([-118.25, 34.05])
  })

  it('drops inService "false" and any value other than the string "true"', () => {
    const off = row('1', { inService: 'false' })
    const bool = { cctv: { ...row('2').cctv, inService: true } } as unknown as CaltransCctv
    expect(californiaCameras.normalize({ aoi: LA, files: [{ district: 7, data: [off, bool] }] })).toEqual([])
  })

  it('drops empty, non-numeric, null-island and non-finite coordinates instead of reading them as 0', () => {
    const bad = [
      row('10', { lng: '', lat: '34.0' }),
      row('11', { lng: '-118.2', lat: 'n/a' }),
      row('12', { lng: '0', lat: '0' }),
      row('13', { lng: 'Infinity', lat: '34.0' }),
    ]
    expect(californiaCameras.normalize({ aoi: LA, files: [{ district: 7, data: bad }] })).toEqual([])
  })

  it('drops cameras without an https:// still image', () => {
    const none = { cctv: { ...row('20').cctv, imageData: { static: {} } } } as CaltransCctv
    const insecure = row('21', { url: 'http://cwwp2.dot.ca.gov/data/d7/x.jpg' })
    expect(californiaCameras.normalize({ aoi: LA, files: [{ district: 7, data: [none, insecure] }] })).toEqual([])
  })

  it('uses the district of the file for the id, so same indexes in two districts stay distinct', () => {
    const files = [
      { district: 7, data: [row('5')] },
      { district: 12, data: [row('5')] },
    ]
    expect(californiaCameras.normalize({ aoi: LA, files }).map((c) => c.id)).toEqual(['caltrans:7-5', 'caltrans:12-5'])
  })
})

describe('caltrans district selection', () => {
  it('a Los Angeles AOI overlaps only D7 and its neighbour D12', () => {
    expect(districtsForBbox(LA)).toEqual([7, 12])
  })

  it('a Seattle AOI overlaps no Caltrans district', () => {
    expect(districtsForBbox(SEATTLE)).toEqual([])
  })

  it('the whole of California overlaps all twelve districts', () => {
    expect(districtsForBbox(CALIFORNIA)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('builds the CWWP2 URL with a zero-padded file number', () => {
    expect(districtUrl(7)).toBe('https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json')
    expect(districtUrl(12)).toBe('https://cwwp2.dot.ca.gov/data/d12/cctv/cctvStatusD12.json')
  })
})

describe('caltrans fetch', () => {
  function mockDistricts() {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      const body = url.includes('/d9/') ? { data: rows } : { data: [] }
      return new Response(JSON.stringify(body), { status: 200 })
    })
  }

  it('fetches only the districts whose box overlaps the AOI', async () => {
    const adapter = await freshAdapter()
    const spy = mockDistricts()
    await adapter.fetch(LA)
    const urls = spy.mock.calls.map(([u]) => String(u)).sort()
    expect(urls).toEqual([districtUrl(12), districtUrl(7)].sort())
  })

  it('makes no request when no district overlaps the AOI', async () => {
    const adapter = await freshAdapter()
    const spy = mockDistricts()
    const raw = await adapter.fetch(SEATTLE)
    expect(spy).not.toHaveBeenCalled()
    expect(raw.files).toEqual([])
  })

  it('caches each district for 12 h independently', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T00:00:00Z'))
    const adapter = await freshAdapter()
    const spy = mockDistricts()
    await adapter.fetch(LA)
    vi.setSystemTime(new Date('2026-10-11T11:59:00Z'))
    await adapter.fetch(LA)
    expect(spy).toHaveBeenCalledTimes(2)
    // Only D9 is new for this AOI (around Mammoth Lakes), so only it is requested.
    await adapter.fetch(MAMMOTH)
    expect(spy).toHaveBeenCalledTimes(3)
    expect(String(spy.mock.calls[2][0])).toBe(districtUrl(9))
    vi.setSystemTime(new Date('2026-10-11T12:01:00Z'))
    await adapter.fetch(LA)
    expect(spy).toHaveBeenCalledTimes(5)
  })

  it('keeps the districts that loaded when one district fails, and only errors when all fail', async () => {
    const adapter = await freshAdapter()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/d12/')) return new Response('down', { status: 500 })
      return new Response(JSON.stringify({ data: rows }), { status: 200 })
    })
    const partial: CaltransRaw = await adapter.fetch(LA)
    expect(partial.files.map((f) => f.district)).toEqual([7])

    vi.restoreAllMocks()
    vi.resetModules()
    const fresh = await freshAdapter()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('down', { status: 503 }))
    await expect(fresh.fetch(LA)).rejects.toThrow('Caltrans camera lists unavailable')
  })
})
