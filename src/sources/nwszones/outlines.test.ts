import { describe, expect, it } from 'vitest'
import type { Alert } from '../../types'
import { allCountyZoneUrls, buildOutlineFeatures, countyZoneUrls, zoneBasedAlerts } from './outlines'
import type { ZoneShape } from './zones'

const COUNTY_A = 'https://api.weather.gov/zones/county/GAC033'
const COUNTY_B = 'https://api.weather.gov/zones/county/SCC009'
const FORECAST = 'https://api.weather.gov/zones/forecast/GAZ087'
const FIRE = 'https://api.weather.gov/zones/fire/GAZ087'

function alert(over: Partial<Alert>): Alert {
  return {
    id: 'urn:oid:x',
    event: 'Tornado Watch',
    severity: 'Severe',
    headline: 'h',
    areaDesc: 'a',
    onset: null,
    expires: null,
    geometry: null,
    states: ['GA'],
    zones: [],
    ...over,
  }
}

const polygon: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
}

describe('zoneBasedAlerts', () => {
  it('keeps geometry-less alerts that touch the AOI states', () => {
    const watch = alert({ id: 'w', states: ['GA', 'SC'] })
    const stormOnly = alert({ id: 's', geometry: polygon })
    const otherState = alert({ id: 'o', states: ['TX'] })
    expect(zoneBasedAlerts([watch, stormOnly, otherState], ['SC']).map((a) => a.id)).toEqual(['w'])
  })
})

describe('countyZoneUrls', () => {
  it('drops forecast and fire zones', () => {
    const a = alert({ zones: [COUNTY_A, FORECAST, FIRE, COUNTY_B] })
    expect(countyZoneUrls(a)).toEqual([COUNTY_A, COUNTY_B])
  })
})

describe('allCountyZoneUrls', () => {
  it('dedupes counties shared between alerts', () => {
    const a = alert({ id: '1', zones: [COUNTY_A, COUNTY_B] })
    const b = alert({ id: '2', zones: [COUNTY_A] })
    expect(allCountyZoneUrls([a, b])).toEqual([COUNTY_A, COUNTY_B])
  })
})

describe('buildOutlineFeatures', () => {
  const shapes = new Map<string, ZoneShape>([['GAC033', { id: 'GAC033', geometry: polygon }]])

  it('emits one feature per resolved county with alert props', () => {
    const a = alert({ id: 'tw', event: 'Tornado Watch', severity: 'Severe', zones: [COUNTY_A] })
    const features = buildOutlineFeatures([a], shapes)
    expect(features).toEqual([
      {
        type: 'Feature',
        geometry: polygon,
        properties: { alertId: 'tw', event: 'Tornado Watch', severity: 'Severe' },
      },
    ])
  })

  it('skips counties whose shape did not load', () => {
    const a = alert({ zones: [COUNTY_A, COUNTY_B] })
    expect(buildOutlineFeatures([a], shapes)).toHaveLength(1)
  })
})
