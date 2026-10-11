import { describe, expect, it } from 'vitest'
import county from './fixtures/county-GAC033.json'
import forecast from './fixtures/forecast-GAZ087.json'
import { normalizeZone, zoneIdFromUrl, zoneUrlToProxy, type NwsZoneResponse } from './zones'

describe('zoneUrlToProxy', () => {
  it('rewrites the NWS origin onto the same-origin proxy', () => {
    expect(zoneUrlToProxy('https://api.weather.gov/zones/county/GAC033')).toBe('/api/nws/zones/county/GAC033')
  })

  it('leaves non-NWS urls untouched', () => {
    expect(zoneUrlToProxy('/api/nws/zones/forecast/GAZ087')).toBe('/api/nws/zones/forecast/GAZ087')
  })
})

describe('zoneIdFromUrl', () => {
  it('takes the last path segment', () => {
    expect(zoneIdFromUrl('https://api.weather.gov/zones/fire/GAZ087')).toBe('GAZ087')
  })
})

describe('normalizeZone', () => {
  it('normalizes a trimmed county fixture', () => {
    const shape = normalizeZone(county as unknown as NwsZoneResponse)
    expect(shape?.id).toBe('GAC033')
    expect(shape?.geometry.type).toBe('Polygon')
    expect(shape?.geometry.coordinates[0][0]).toEqual([-82.096596, 33.230614])
  })

  it('normalizes a trimmed forecast-zone fixture (id from URL, not properties.type)', () => {
    const shape = normalizeZone(forecast as unknown as NwsZoneResponse)
    expect(shape?.id).toBe('GAZ087')
    expect(shape?.geometry.type).toBe('Polygon')
  })

  it('accepts MultiPolygon geometry', () => {
    const shape = normalizeZone({
      id: 'https://api.weather.gov/zones/county/SCC009',
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] },
    })
    expect(shape?.geometry.type).toBe('MultiPolygon')
  })

  it('returns null for a zone without a polygon', () => {
    expect(normalizeZone({ id: 'https://api.weather.gov/zones/county/GAC001', geometry: null })).toBeNull()
    expect(
      normalizeZone({
        id: 'https://api.weather.gov/zones/county/GAC001',
        geometry: { type: 'Point', coordinates: [0, 0] },
      }),
    ).toBeNull()
  })
})
