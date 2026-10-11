import { describe, expect, it } from 'vitest'
import mcdJson from './fixtures/spc-mcd.geojson?raw'
import { normalizeMesoscale } from './mesoscale'

const raw = (): GeoJSON.FeatureCollection => JSON.parse(mcdJson)
const at = (iso: string) => Date.parse(iso)

describe('normalizeMesoscale', () => {
  it('labels each active discussion MD <num> and keeps only the trimmed shape', () => {
    const features = normalizeMesoscale(raw(), at('2025-05-05T23:00:00Z'))
    expect(features.map((f) => f.properties.label)).toEqual(['MD 702', 'MD 703', 'MD 706'])
    expect(features[0].properties).toEqual({
      num: 702,
      label: 'MD 702',
      expires: '2025-05-06T00:00:00Z',
      kind: 'MD',
    })
    expect(features[0].geometry.type).toBe('Polygon')
  })

  it('drops discussions whose expiry is at or before the injected now', () => {
    const features = normalizeMesoscale(raw(), at('2025-05-06T00:10:00Z'))
    expect(features.map((f) => f.properties.num)).toEqual([703, 706])
  })

  it('returns nothing once every discussion has expired', () => {
    expect(normalizeMesoscale(raw(), at('2025-05-06T02:00:00Z'))).toEqual([])
  })

  it('drops records with no usable expiry or number', () => {
    const fc = raw()
    fc.features[0].properties = { ...fc.features[0].properties, expire: 'not a date' }
    fc.features[1].properties = { ...fc.features[1].properties, num: undefined }
    const features = normalizeMesoscale(fc, at('2025-05-05T23:00:00Z'))
    expect(features.map((f) => f.properties.num)).toEqual([706])
  })
})
