import { describe, expect, it } from 'vitest'
import watchJson from './fixtures/spc-watches.geojson?raw'
import { normalizeWatches } from './watches'

const raw = (): GeoJSON.FeatureCollection => JSON.parse(watchJson)
const at = (iso: string) => Date.parse(iso)

describe('normalizeWatches', () => {
  it('maps TOR and SVR watches to kind and label', () => {
    const features = normalizeWatches(raw(), at('2025-05-05T23:00:00Z'))
    expect(features.map((f) => [f.properties.kind, f.properties.label])).toEqual([
      ['SVR', 'SVR 223'],
      ['TOR', 'TOR 227'],
      ['SVR', 'SVR 228'],
    ])
    expect(features[1].properties.expires).toBe('2025-05-06T02:03:00Z')
    expect(features[1].geometry.type).toBe('MultiPolygon')
  })

  it('drops watches whose utc_expired is at or before the injected now', () => {
    const features = normalizeWatches(raw(), at('2025-05-06T01:30:00Z'))
    expect(features.map((f) => f.properties.label)).toEqual(['TOR 227', 'SVR 228'])
  })

  it('returns nothing once every watch has expired', () => {
    expect(normalizeWatches(raw(), at('2025-05-06T03:00:00Z'))).toEqual([])
  })

  it('ignores watch types other than TOR or SVR', () => {
    const fc = raw()
    fc.features[0].properties = { ...fc.features[0].properties, type: 'FFW' }
    const features = normalizeWatches(fc, at('2025-05-05T23:00:00Z'))
    expect(features.map((f) => f.properties.num)).toEqual([227, 228])
  })
})
