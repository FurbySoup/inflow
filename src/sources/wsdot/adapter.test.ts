import { afterEach, describe, expect, it, vi } from 'vitest'
import wa from './fixtures/cameras-wa.json'
import { washingtonCameras, type WsdotFeature, type WsdotRaw } from './adapter'

const features = (wa as { features: WsdotFeature[] }).features
const SEATTLE = { west: -122.5, south: 47.4, east: -122.2, north: 47.7 }
const PORTLAND = { west: -122.8, south: 45.4, east: -122.5, north: 45.7 }
const SPOKANE = { west: -117.6, south: 47.5, east: -117.3, north: 47.8 }

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.resetModules()
})

// The adapter keeps its list in module memory, so cache tests load a fresh copy of the module.
async function freshAdapter() {
  vi.resetModules()
  const mod = await import('./adapter')
  return mod.washingtonCameras
}

function feature(id: number, lng: number, lat: number, url: string | null = `https://images.wsdot.wa.gov/x/${id}.jpg`): WsdotFeature {
  return {
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { OBJECTID: id, CameraTitle: `cam ${id}`, ImageURL: url },
  }
}

describe('wsdot normalize', () => {
  it('keeps only points inside the AOI bbox and maps them to CameraFeed', () => {
    const cams = washingtonCameras.normalize({ aoi: SEATTLE, features })
    expect(cams.map((c) => c.id)).toEqual(['wsdot:1022', 'wsdot:9377'])
    expect(cams[0]).toEqual({
      id: 'wsdot:1022',
      title: 'I-5 at MP 158: Boeing Access Rd North',
      location: [-122.28229999999996, 47.507922000000065],
      snapshotUrl: 'https://images.wsdot.wa.gov/nw/005vc15805.jpg',
      streamUrl: null,
      state: 'WA',
    })
  })

  it('tags an Oregon camera on the TripCheck feed as OR, not WA', () => {
    const cams = washingtonCameras.normalize({ aoi: PORTLAND, features })
    expect(cams.map((c) => c.id)).toEqual(['wsdot:3011'])
    expect(cams[0].state).toBe('OR')
    expect(cams[0].snapshotUrl).toBe('https://www.tripcheck.com/RoadCams/cams/i8428th_pid578.jpg')
  })

  it('tags a Washington camera as WA in the east of the state', () => {
    const cams = washingtonCameras.normalize({ aoi: SPOKANE, features })
    expect(cams.map((c) => [c.id, c.state])).toEqual([['wsdot:1113', 'WA']])
  })

  it('includes edge points (bbox edges are inclusive)', () => {
    const edge = { west: -122.2, south: 47.5, east: -122.1, north: 47.6 }
    const cams = washingtonCameras.normalize({ aoi: edge, features: [feature(7, -122.2, 47.5)] })
    expect(cams.map((c) => c.id)).toEqual(['wsdot:7'])
  })

  it('drops http:// and missing image URLs (mixed content)', () => {
    const insecure = feature(1, -122.3, 47.6, 'http://images.wsdot.wa.gov/a.jpg')
    const missing = feature(2, -122.3, 47.6, null)
    expect(washingtonCameras.normalize({ aoi: SEATTLE, features: [insecure, missing] })).toEqual([])
  })

  it('drops non-point and null geometries', () => {
    const line: WsdotFeature = { geometry: { type: 'LineString', coordinates: [-122.3, 47.6] }, properties: { OBJECTID: 3, ImageURL: 'https://a.example/x.jpg' } }
    const none: WsdotFeature = { geometry: null, properties: { OBJECTID: 4, ImageURL: 'https://a.example/x.jpg' } }
    expect(washingtonCameras.normalize({ aoi: SEATTLE, features: [line, none] })).toEqual([])
  })
})

describe('wsdot fetch', () => {
  function mockList(count: { n: number }) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      count.n++
      return new Response(JSON.stringify({ type: 'FeatureCollection', features }), {
        status: 200,
        headers: { 'content-type': 'application/geo+json' },
      })
    })
  }

  it('requests OBJECTID with the other outFields from the keyless layer', async () => {
    const adapter = await freshAdapter()
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ features }), { status: 200 }))
    const raw = (await adapter.fetch(SEATTLE)) as WsdotRaw
    expect(raw.aoi).toEqual(SEATTLE)
    expect(raw.features).toHaveLength(4)
    const url = String(spy.mock.calls[0][0])
    expect(url).toContain('data.wsdot.wa.gov/arcgis/rest/services/TravelInformation/TravelInfoCamerasWeather/FeatureServer/0/query')
    expect(url).toContain('outFields=OBJECTID,CameraTitle,ImageURL')
    expect(url).toContain('f=geojson')
  })

  it('serves a second fetch within 12 h from memory, then loads again after 12 h', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T00:00:00Z'))
    const adapter = await freshAdapter()
    const count = { n: 0 }
    mockList(count)
    await adapter.fetch(SEATTLE)
    vi.setSystemTime(new Date('2026-10-11T11:59:00Z'))
    await adapter.fetch(SEATTLE)
    expect(count.n).toBe(1)
    vi.setSystemTime(new Date('2026-10-11T12:01:00Z'))
    await adapter.fetch(SEATTLE)
    expect(count.n).toBe(2)
  })

  it('does not cache a failed load, so the next call retries', async () => {
    const adapter = await freshAdapter()
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ features }), { status: 200 }))
    await expect(adapter.fetch(SEATTLE)).rejects.toThrow('WSDOT camera list 503')
    const raw = await adapter.fetch(SEATTLE)
    expect(raw.features).toHaveLength(4)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('rejects a 200 response without a features array instead of caching it', async () => {
    const adapter = await freshAdapter()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 500 } }), { status: 200 }))
    await expect(adapter.fetch(SEATTLE)).rejects.toThrow('unexpected response')
  })
})
