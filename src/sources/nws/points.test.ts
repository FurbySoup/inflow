import { afterEach, describe, expect, it, vi } from 'vitest'
import fixture from './fixtures/points-ffc.json'
import { centreKey, nwsPoint, type NwsPointResponse } from './points'

const atlanta = { west: -84.9, south: 33.2, east: -83.9, north: 34.2 }

afterEach(() => vi.unstubAllGlobals())

describe('nwsPoint.normalize', () => {
  it('reads cwa, zone, radar and city/state from the fixture', () => {
    expect(nwsPoint.normalize(fixture as NwsPointResponse)).toEqual([
      { cwa: 'FFC', timeZone: 'America/New_York', radarStation: 'KFFC', place: 'Atlanta, GA' },
    ])
  })

  it('returns no items for a null (offshore) raw response', () => {
    expect(nwsPoint.normalize(null)).toEqual([])
  })

  it('gives a null place when the relative location is missing', () => {
    const raw = { properties: { ...fixture.properties, relativeLocation: undefined } } as NwsPointResponse
    expect(nwsPoint.normalize(raw)[0].place).toBeNull()
  })
})

describe('nwsPoint.fetch', () => {
  it('resolves null without throwing on a non-200 (offshore HTTP 500)', async () => {
    const mock = vi.fn<typeof fetch>(async () => new Response('{}', { status: 500 }))
    vi.stubGlobal('fetch', mock)
    const raw = await nwsPoint.fetch({ west: -61, south: 29, east: -59, north: 31 })
    expect(raw).toBeNull()
    expect(nwsPoint.normalize(raw)).toEqual([])
  })

  it('rounds the AOI centre to 0.1°, so nearby centres make one request', async () => {
    const mock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(fixture), { status: 200 }))
    vi.stubGlobal('fetch', mock)
    const a = await nwsPoint.fetch(atlanta)
    const b = await nwsPoint.fetch({ west: -84.85, south: 33.22, east: -83.93, north: 34.24 })
    expect(mock).toHaveBeenCalledTimes(1)
    expect(String(mock.mock.calls[0][0])).toBe('/api/nws/points/33.7,-84.4')
    expect(b).toEqual(a)
  })
})

describe('centreKey', () => {
  it('uses the bbox centre rounded to one decimal', () => {
    expect(centreKey(atlanta)).toBe('33.7,-84.4')
  })
})
